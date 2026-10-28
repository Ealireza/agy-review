// Grounding: trust nothing the model says about the code until it is found in the real file.
// A finding survives only if its quoted evidence exists in the cited file. Wrong line numbers are corrected; invented code is rejected.
import { redactLine } from "./security.mjs";
import { CATEGORIES, CONFIDENCES, PRIORITIES, SEVERITIES, norm, sevRank, sha } from "./util.mjs";

const MIN_CHARS = 12;     // non-space characters needed to anchor a finding
const LINE_TOLERANCE = 3; // the reported line may be this far from the real one before we call it "relocated"
const GENERIC = new Set(["return", "null", "none", "nil", "true", "false", "break", "continue", "else", "this", "self", "pass", "void", "const", "let", "var", "new", "end", "then", "undefined", "throw", "if", "for", "while", "try", "catch", "finally", "case", "default"]);
const BAND = { critical: ["P0", "P0"], high: ["P0", "P1"], medium: ["P1", "P2"], low: ["P2", "P3"], nit: ["P3", "P3"] };
const LOW_ONLY = new Set(["readability", "documentation"]); // style-like categories can never outrank "low"

const EXPLOITABILITY = ["demonstrated", "likely", "conditional", "theoretical"];
// A CVE id is a model claim that this tool cannot check offline: keep it, but label it unverified.
const securityFields = (f, exploitability) => {
  const cve = /^CVE-\d{4}-\d{4,}$/.test(f.cve ?? "") ? f.cve : "";
  return {
    owasp: String(f.owasp ?? "").trim(), cve, ...(cve ? { cve_verified: false } : {}), exploitability,
    attack_scenario: String(f.attack_scenario ?? "").trim(), data_flow: String(f.data_flow ?? "").trim(),
  };
};

const stripPrefix = (l) => String(l).replace(/^\s*\d+\s*\|\s?/, ""); // the "  42| " numbering the prompt adds
const isMarker = (l) => /^\s*-{3,}\s*scope (starts|ends)\s*-{3,}\s*$/.test(l);

export function evidenceLines(evidence) {
  return String(evidence ?? "").split(/\r?\n/).filter((l) => !isMarker(l)).map((l) => norm(stripPrefix(l))).filter(Boolean);
}

// Is the quote specific enough to prove anything? Needs enough characters and a non-keyword identifier.
export function anchorable(ev) {
  const text = ev.join(" ");
  if (text.replace(/\s/g, "").length < MIN_CHARS) return false;
  return (text.match(/[A-Za-z_$][\w$]{2,}/g) ?? []).some((w) => !GENERIC.has(w.toLowerCase()));
}

// Finds the quoted evidence in `lines` (array of strings). Returns { start, end, hits } (1-based) or null.
export function locateEvidence(lines, evidence, hint = 1) {
  const ev = Array.isArray(evidence) ? evidence : evidenceLines(evidence);
  if (!ev.length || !anchorable(ev)) return null;
  const nl = lines.map(norm);
  const hits = [];
  for (let i = 0; i < nl.length; i++) {
    let ok;
    if (ev.length === 1) ok = nl[i].includes(ev[0]);
    else {
      ok = nl[i].endsWith(ev[0]) && (nl[i + ev.length - 1] ?? "").startsWith(ev[ev.length - 1]);
      for (let k = 1; k < ev.length - 1 && ok; k++) ok = nl[i + k] === ev[k];
    }
    if (ok) hits.push({ start: i + 1, end: i + ev.length });
  }
  if (!hits.length) {
    const wrapped = locateWrapped(nl, ev.join(" "));
    if (!wrapped.length) return null;
    hits.push(...wrapped);
  }
  hits.sort((a, b) => Math.abs(a.start - hint) - Math.abs(b.start - hint));
  return { ...hits[0], hits: hits.length };
}

// The quote may be one logical statement that the file wraps over several lines: smallest window that contains it.
function locateWrapped(nl, text) {
  const target = norm(text);
  const spans = new Map();
  for (let i = 0; i < nl.length; i++) {
    if (!nl[i] || !target.startsWith(nl[i].slice(-Math.min(nl[i].length, 40)))) continue;
    let acc = "";
    for (let j = i; j < Math.min(nl.length, i + 12); j++) {
      acc = norm(acc + " " + nl[j]);
      if (acc.includes(target)) {
        if (!norm(nl.slice(i + 1, j + 1).join(" ")).includes(target)) spans.set(`${i}:${j}`, { start: i + 1, end: j + 1 });
        break;
      }
      if (acc.length > target.length + 400) break;
    }
  }
  return [...spans.values()];
}

const bandPriority = (sev, pri) => {
  const [lo, hi] = BAND[sev], p = PRIORITIES.includes(pri) ? pri : lo;
  return PRIORITIES.indexOf(p) < PRIORITIES.indexOf(lo) ? lo : PRIORITIES.indexOf(p) > PRIORITIES.indexOf(hi) ? hi : p;
};

export const order = (a, b) => sevRank(a.severity) - sevRank(b.severity) || PRIORITIES.indexOf(a.priority) - PRIORITIES.indexOf(b.priority) || a.file.localeCompare(b.file) || a.line_start - b.line_start;

// Stable identity: the file, the normalised source text at the first cited line, and which occurrence of that text it is.
function makeId(label, lines, start) {
  const text = norm(lines[start - 1] ?? "");
  let nth = 0;
  for (let i = 0; i < start - 1; i++) if (norm(lines[i] ?? "") === text) nth++;
  return sha(`${label}|${text}|${nth}`);
}

// Is `a` the better-supported of two findings about the same code? Higher confidence first, then the more severe.
const better = (a, b) => {
  const c = CONFIDENCES.indexOf(a.confidence) - CONFIDENCES.indexOf(b.confidence);
  return c !== 0 ? c > 0 : sevRank(a.severity) < sevRank(b.severity);
};

// ctx: { sources: Map<label,{lines}>, load(label)->{lines}|null, canon(label)->label, scopes: [{label,start,end}],
//        restricted?: bool (git targets: an empty scope means "nothing in scope", not "everything"),
//        diffByFile?: Map<label,string[]> (+/- lines of the change, for evidence of removed code), minConfidence }
export function ground(report, ctx) {
  const out = { verified: [], speculative: [], rejected: [] };
  const byId = new Map();
  const restricted = ctx.restricted ?? !!ctx.scopes?.length;
  const clean = (s) => redactLine(String(s ?? "")); // never echo a recognised secret back into a report
  const reject = (f, reason) => out.rejected.push({ title: clean(f?.title ?? "(untitled)"), file: String(f?.file ?? ""), line_start: f?.line_start ?? null, severity: f?.severity ?? null, evidence: clean(f?.evidence ?? "").slice(0, 300), reason });
  const minRank = CONFIDENCES.indexOf(ctx.minConfidence ?? "medium");

  for (const f of Array.isArray(report?.findings) ? report.findings : []) {
    if (!f || typeof f !== "object") { reject(f, "not an object"); continue; }
    if (!SEVERITIES.includes(f.severity)) { reject(f, `invalid severity '${f.severity}'`); continue; }
    if (!f.title || !f.explanation) { reject(f, "missing title or explanation"); continue; }
    if (!f.file) { reject(f, "no file cited"); continue; }
    const raw = String(f.file).replace(/\\/g, "/").replace(/^\.\//, "");
    const label = ctx.canon ? ctx.canon(raw) : raw;
    const src = ctx.sources.get(label) ?? ctx.load?.(label) ?? null;
    if (!src) { reject(f, `cited file '${raw}' is not available`); continue; }

    const ev = evidenceLines(f.evidence);
    if (!ev.length || !anchorable(ev)) { reject(f, "evidence too short or generic to anchor the finding to code"); continue; }
    const hinted = Number(f.line_start);
    let loc = locateEvidence(src.lines, ev, Number.isFinite(hinted) ? hinted : 1);
    let grounding;
    if (loc) {
      const near = Number.isFinite(hinted) && Math.abs(hinted - loc.start) <= LINE_TOLERANCE;
      if (loc.hits > 1 && !near) { reject(f, `quote matches ${loc.hits} places and none is near the cited line (ambiguous)`); continue; }
      grounding = near ? "exact" : "relocated";
    } else if (ctx.diffByFile?.get(label) && locateEvidence(ctx.diffByFile.get(label), ev, 1)) {
      // Removed code is gone from the file, but the diff still shows it.
      const s = Math.max(1, Number.isFinite(hinted) ? hinted : 1);
      loc = { start: s, end: s + ev.length - 1, hits: 1 };
      grounding = "diff";
    } else { reject(f, "evidence quote not found in the cited file (possible hallucination)"); continue; }

    const category = CATEGORIES.includes(f.category) ? f.category : "other";
    let severity = LOW_ONLY.has(category) && sevRank(f.severity) < sevRank("low") ? "low" : f.severity;
    const exploitability = EXPLOITABILITY.includes(f.exploitability) ? f.exploitability : null;
    if (exploitability === "theoretical" && sevRank(severity) < sevRank("medium")) severity = "medium"; // no concrete path: never above medium
    let confidence = CONFIDENCES.includes(f.confidence) ? f.confidence : "low";
    if (grounding === "diff" && confidence === "high") confidence = "medium";
    const scope = !restricted || ctx.scopes.some((s) => s.label === label && loc.start <= s.end && loc.end >= s.start) ? "in" : "context";
    const item = {
      id: makeId(label, src.lines, loc.start),
      title: clean(f.title).trim(), severity, priority: bandPriority(severity, f.priority), category, confidence,
      file: label, line_start: loc.start, line_end: Math.max(loc.start, loc.end),
      evidence: clean(String(f.evidence).split(/\r?\n/).filter((l) => !isMarker(l)).map(stripPrefix).join("\n")).trim(),
      explanation: clean(f.explanation).trim(), fix: clean(f.fix).trim(),
      cwe: /^CWE-\d+$/.test(f.cwe ?? "") ? f.cwe : "", scope, grounding,
      ...(exploitability ? securityFields(f, exploitability) : {}),
    };
    const prev = byId.get(item.id);
    if (prev && prev.category === item.category) { // the same problem reported twice: keep the better-supported one and say what was dropped
      const [keep, drop] = better(item, prev) ? [item, prev] : [prev, item];
      reject(drop, `duplicate of ${keep.id}`);
      byId.set(item.id, keep);
    } else {
      if (prev) item.id = sha(`${item.id}|${item.category}`); // a different problem on the same line keeps its own identity
      byId.set(item.id, item);
    }
  }
  for (const item of byId.values()) (CONFIDENCES.indexOf(item.confidence) >= minRank ? out.verified : out.speculative).push(item);
  out.verified.sort(order);
  out.speculative.sort(order);
  return out;
}

export function countBySeverity(findings) {
  const c = Object.fromEntries(SEVERITIES.map((s) => [s, 0]));
  for (const f of findings) c[f.severity]++;
  c.total = findings.length;
  return c;
}

// Share of the requested lines the model says it examined (0..1). Static targets only.
export function coverage(regions, scopeReviewed) {
  let want = 0, got = 0;
  for (const r of regions) {
    const end = r.end;
    want += end - r.start + 1;
    const seen = new Set();
    for (const s of scopeReviewed ?? []) {
      if (String(s.file).replace(/\\/g, "/") !== r.label) continue;
      for (let l = Math.max(r.start, s.line_start); l <= Math.min(end, s.line_end); l++) seen.add(l);
    }
    got += seen.size;
  }
  return want ? got / want : 1;
}

// The verdict comes from verified, in-scope findings only. "Nothing verified" is not "approve" when the model disagreed,
// when findings were rejected, or when the model did not cover the code: that is inconclusive.
export function computeVerdict({ findings, rejected = [], modelVerdicts = [], coverageRatio = 1, incomplete = false }) {
  const gating = findings.filter((f) => f.scope === "in");
  if (gating.some((f) => f.severity === "critical" || f.severity === "high")) return "request_changes";
  if (gating.some((f) => f.severity === "medium" || f.severity === "low")) return "approve_with_comments";
  if (incomplete || coverageRatio < 0.8) return "inconclusive";
  if (!gating.length && (rejected.length || modelVerdicts.some((v) => v && v !== "approve"))) return "inconclusive";
  return "approve";
}

export function gateFails(findings, failOn) {
  if (!failOn || failOn === "none") return false;
  return findings.some((f) => f.scope === "in" && sevRank(f.severity) <= sevRank(failOn));
}
