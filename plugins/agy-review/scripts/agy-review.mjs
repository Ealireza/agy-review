#!/usr/bin/env bun
// agy-review: independent code review, security review and plain tasks by Antigravity (agy). Runs on Bun or Node 18.18+. See README.md.
//   review    git changes (default) | --file F[:A-B] | --symbol NAME | --stdin           -> graded, grounded report
//   security  --security (same targets, security method, pattern scanner, related code)
//   task      --task "instruction" | --preset translate --to <lang>                      -> plain text result
// Safety: agentic reviews start agy with --dangerously-skip-permissions, so the read-only guard hook MUST be installed;
// this script refuses to run them without it and reports any change to the working tree afterwards.
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { agyVersion, effortCaps, listModels, resolveModel, runAgy } from "./lib/agy.mjs";
import { CONFIG_KEYS, gitRoot, loadConfig, setConfig, unsetConfig, validate } from "./lib/config.mjs";
import { effortForReview, effortForTask, resolveEffort } from "./lib/effort.mjs";
import * as gfy from "./lib/graphify.mjs";
import { startShim } from "./lib/shim.mjs";
import { changeScope } from "./lib/gitscope.mjs";
import { computeVerdict, countBySeverity, coverage, gateFails, ground, locateEvidence, order } from "./lib/ground.mjs";
import { compareWithPrevious, mergeRuns, splitByConfidence } from "./lib/merge.mjs";
import { ROOT, SCHEMA_PATH, agenticPrompt, staticPrompt, taskPrompt } from "./lib/prompt.mjs";
import { renderMarkdown } from "./lib/render.mjs";
import { expandRelated, redactLine, redactLines, scan, secretFindings, securitySchemaPath } from "./lib/security.mjs";
import { describeCandidates, findSymbol, langOf, parseRange, readSource } from "./lib/targets.mjs";
import { buildInstruction, checkPreservation, loadGlossary, splitChunks } from "./lib/translate.mjs";
import { EXIT, SECRET_PATH, UsageError, compareVersions, lastJsonObject, sha, sh } from "./lib/util.mjs";

const VERSION = JSON.parse(fs.readFileSync(path.join(ROOT, ".claude-plugin", "plugin.json"), "utf8")).version;
const SELF = fileURLToPath(import.meta.url);
const RT = process.versions.bun ? "bun" : "node"; // how this process was started; used in hints
const BUNDLED_GUARD = path.join(ROOT, "antigravity-plugin", "readonly-review");
const GUARD_DIR = path.join(os.homedir(), ".gemini", "config", "plugins", "readonly-review");
const MARKER = "AGY_READONLY_REVIEW";
const REF = /^[\w./~^@{}-]+$/;

const out = (s) => process.stdout.write(s.endsWith("\n") ? s : s + "\n");
const err = (s) => process.stderr.write(s.endsWith("\n") ? s : s + "\n");
const fail = (msg, code = EXIT.error) => { err(msg); process.exit(code); };

// ---------------------------------------------------------------- arguments

const GRAPHIFY_ACTIONS = ["setup", "update", "status", "doctor", "hook-install", "hook-uninstall", "rules", "serve"];
const VALUE = new Set(["--graphify", "--base", "--commit", "--paths", "--file", "--lines", "--symbol", "--name", "--lang", "--start-line", "--context", "--focus", "--context-lines", "--model", "--models", "--effort", "--timeout", "--fail-on", "--min-confidence", "--format", "--output", "--previous", "--set", "--unset", "--task", "--input", "--respond-as", "--preset", "--to", "--from", "--variant", "--tone", "--audience", "--glossary", "--keep", "--notes"]);
const BOOL = new Set(["--version", "--update-check", "--detach", "--quiet", "--debug", "--full", "--keep-graphify-hook", "--yes", "--write-rules", "--restore-graphify", "--staged", "--stdin", "--agentic", "--security", "--related", "--no-related", "--strict", "--json", "--list-models", "--refresh", "--show-config", "--global", "--check", "--verify", "--install-guard", "--uninstall-guard", "--wait", "--background", "--help"]);

export function parseArgs(argv) {
  const o = { words: [], files: [], inputs: [], set: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (BOOL.has(a)) { o[a.slice(2)] = true; continue; }
    if (VALUE.has(a)) {
      if (i + 1 >= argv.length) throw new UsageError(`${a} needs a value`);
      const v = argv[++i], k = a.slice(2);
      if (k === "file") o.files.push(v); else if (k === "input") o.inputs.push(v); else if (k === "set") o.set.push(v); else o[k] = v;
      continue;
    }
    if (a.startsWith("--")) throw new UsageError(`Unknown option ${a}. Run with --help.`);
    o.words.push(a);
  }
  if (o.json) o.format = "json";
  if (o.format && !["md", "json", "text"].includes(o.format)) throw new UsageError("--format must be md, json or text");
  for (const k of ["base", "commit"]) if (o[k] && !REF.test(o[k])) throw new UsageError(`Unsafe --${k} value: ${o[k]}`);
  // Numbers and enums are validated once, here, with the same rules the settings file uses.
  for (const [flag, key] of [["timeout", "timeout"], ["effort", "effort"], ["context-lines", "contextLines"], ["start-line", "startLine"], ["fail-on", "failOn"], ["min-confidence", "minConfidence"]]) {
    if (o[flag] !== undefined) o[flag] = validate(key, o[flag]);
  }
  if (o.preset && o.preset !== "translate") throw new UsageError(`Unknown --preset '${o.preset}'. Available: translate`);
  if (o.graphify && !GRAPHIFY_ACTIONS.includes(o.graphify)) throw new UsageError(`Unknown --graphify action '${o.graphify}'. Available: ${GRAPHIFY_ACTIONS.join(", ")}`);
  return o;
}

const HELP = `agy-review ${VERSION}   (runs on Bun or Node 18.18+)

Review targets (default: uncommitted git changes)
  --base <ref> | --staged | --commit <sha> [--paths a,b]   git changes
  --file <path[:A-B]> (repeatable) | --lines A-B             a file or a line range
  --symbol <name> [--file <path>]                            a function / class by name
  --stdin [--name <label>] [--lang <l>] [--start-line N]     code piped on stdin
  --agentic                                                  let the reviewer read the repo (guarded, read-only)
Review options
  --security                              security method: threat model, OWASP/CWE, pattern scanner; related code is added
  --related | --no-related                add callers and callees of the target as context (default on with --security, static targets)
  --context "<what the code should do>"   --focus "<areas>"   --context-lines N (static, default 40)
  --model <id|name>  --models a,b (cross-check)  --effort auto|low|medium|high|xhigh|max  --timeout <min>
  --fail-on none|critical|high|medium|low|nit   --min-confidence low|medium|high
  --format md|json (--json)  --output <file>  --previous <report.json>
Models and settings
  --list-models [--refresh] (shows the --effort each model accepts, read from agy)   --set key=value [--global]   --unset key [--global]   --show-config   (keys: ${CONFIG_KEYS.join(", ")})
Tasks (no repository, no tools)
  --task "<instruction>" [--input <file>]... [--stdin] [--respond-as "<format>"] [--format json] [--output <file>]
  --preset translate --to <lang> [--from l] [--variant v] [--tone t] [--audience a] [--glossary file] [--keep a,b] [--notes "..."] [--strict]
graphify (keep a graphify graph fresh on Antigravity: no Claude/Codex tokens, no API key)
  --graphify setup [--yes] [--write-rules] [--keep-graphify-hook]   check, install git hooks, (optionally) add the openai package
  --graphify update [--full] [--detach] [--quiet] [--debug]          update the graph now (hooks call this with --detach --quiet)
  --graphify status | doctor | hook-install | hook-uninstall [--restore-graphify] | rules [--write-rules] | serve
  settings: graphifyModel, graphifyEffort (default low), graphifyConcurrency (default 3), graphifyLabels (default true)
Setup
  --version  --update-check (is a newer release on GitHub?)
  --check  --install-guard  --uninstall-guard  --verify
Exit codes: 0 ok | 1 error | 2 usage/prerequisite | 3 tree modified during agentic review | 4 inconclusive/incomplete | 10 gate failed | 11 translation check failed (--strict)`;

// ---------------------------------------------------------------- guard + prerequisites

const hash = (b) => sha(b, 40);
function guardState() {
  const files = ["plugin.json", "hooks.json", "guard.mjs"];
  if (!files.every((f) => fs.existsSync(path.join(GUARD_DIR, f)))) return "missing";
  const same = (f) => { try { return hash(fs.readFileSync(path.join(GUARD_DIR, f))) === hash(fs.readFileSync(path.join(BUNDLED_GUARD, f))); } catch { return false; } };
  return files.every(same) ? "ok" : "outdated";
}

// The guard counts as verified only if a passing --verify was recorded for exactly this guard and this agy version.
const MARKER_FILE = path.join(GUARD_DIR, ".verified.json");
const installedGuardHash = () => hash(Buffer.concat(["plugin.json", "hooks.json", "guard.mjs"].map((f) => fs.readFileSync(path.join(GUARD_DIR, f)))));
function guardVerified() {
  try {
    const m = JSON.parse(fs.readFileSync(MARKER_FILE, "utf8"));
    return m.guard_hash === installedGuardHash() && m.agy_version === agyVersion() ? "ok" : "stale";
  } catch { return "missing"; }
}

// guard: false (not needed) | "installed" | true (installed and verified, required before an agentic review)
function prereqs({ git = true, guard = true } = {}) {
  const v = agyVersion();
  const rows = [["agy CLI", !!v, v ?? "not found. Install the Antigravity CLI and run `agy` once to sign in"]];
  if (git) { const g = sh("git", ["--version"]); rows.push(["git", g.status === 0, g.status === 0 ? g.stdout.trim() : "not found"]); }
  if (guard) {
    const s = guardState();
    rows.push(["read-only guard", s === "ok", s === "ok" ? GUARD_DIR : `${s}. Run: ${RT} "${SELF}" --install-guard`]);
    if (guard === true && s === "ok") {
      const ver = guardVerified();
      rows.push(["guard verified", ver === "ok", ver === "ok" ? `verified for agy ${v}` : `${ver === "stale" ? "the guard or agy changed since the last check" : "never verified"}. Run: ${RT} "${SELF}" --verify`]);
    }
  }
  return rows;
}
const requireOk = (rows) => { const bad = rows.filter((r) => !r[1]); if (bad.length) fail(bad.map((r) => `Missing: ${r[0]} - ${r[2]}`).join("\n"), EXIT.usage); };

function installGuard() {
  fs.rmSync(GUARD_DIR, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(GUARD_DIR), { recursive: true });
  fs.cpSync(BUNDLED_GUARD, GUARD_DIR, { recursive: true });
  out(`Installed read-only guard to ${GUARD_DIR}\nRun --verify to prove it blocks writes on your machine.`);
}

// ---------------------------------------------------------------- targets

function readStdin() {
  if (process.stdin.isTTY) throw new UsageError("--stdin needs piped input, e.g.  cat file.py | agy-review --stdin --lang python");
  return fs.readFileSync(0, "utf8").replace(/^\uFEFF/, "");
}

function gitTarget(o, cwd) {
  const paths = o.paths ? o.paths.split(",").map((p) => p.trim()).filter(Boolean) : [];
  const scope = paths.length ? ` Limit the review to: ${paths.join(", ")}.` : "";
  const tail = paths.length ? ` -- ${paths.join(" ")}` : "";
  let kind = "working", ref, description, instructions, stat;
  if (o.base) {
    kind = "base"; ref = o.base;
    description = `branch changes versus ${o.base}`;
    instructions = `all commits and changes on this branch versus \`${o.base}\`. Start with \`git diff ${o.base}...HEAD --stat${tail}\`, \`git log ${o.base}..HEAD --oneline\`, then \`git status --short\` for uncommitted work.${scope}`;
    stat = sh("git", ["diff", "--shortstat", `${o.base}...HEAD`, ...(paths.length ? ["--", ...paths] : [])], cwd).stdout;
  } else if (o.commit) {
    kind = "commit"; ref = o.commit;
    description = `commit ${o.commit}`;
    instructions = `the single commit \`${o.commit}\`. Start with \`git show ${o.commit} --stat${tail}\`, then \`git show ${o.commit}${tail}\`.${scope}`;
    stat = sh("git", ["show", "--shortstat", "--format=", o.commit, ...(paths.length ? ["--", ...paths] : [])], cwd).stdout;
  } else if (o.staged) {
    kind = "staged";
    description = "staged changes";
    instructions = `the staged changes only. Start with \`git diff --cached --stat${tail}\`, then \`git diff --cached${tail}\`.${scope}`;
    stat = sh("git", ["diff", "--cached", "--shortstat", ...(paths.length ? ["--", ...paths] : [])], cwd).stdout;
  } else {
    description = "working tree (staged, unstaged and untracked)";
    instructions = `the current working tree. Start with \`git status --short\`, then \`git diff HEAD${tail}\`; read untracked files directly.${scope}`;
    stat = sh("git", ["diff", "HEAD", "--shortstat", ...(paths.length ? ["--", ...paths] : [])], cwd).stdout;
  }
  const n = [...String(stat).matchAll(/(\d+) (?:insertion|deletion)/g)].reduce((a, m) => a + +m[1], 0);
  const changes = changeScope(cwd, { kind, ref, paths });
  const lines = Math.max(n, changes.regions.reduce((a, r) => a + (r.end - r.start + 1), 0), 1);
  return { kind: "git", description, instructions, lines, regions: [], scopes: changes.regions, deleted: changes.deleted, diffByFile: changes.diffByFile };
}

function codeTarget(o, root) {
  if (o.lines && !(o.files.length === 1 && !o.symbol && !o.stdin)) throw new UsageError("--lines applies to exactly one --file. For several files write --file a.js:10-20 --file b.js:5-9");
  const sources = new Map(), regions = [];
  const add = (src, start, end, extra = {}) => {
    sources.set(src.label, src);
    regions.push({ label: src.label, start, end: Math.min(end, src.lines.length), language: langOf(src.label), ...extra });
  };
  if (o.stdin) {
    const text = readStdin();
    if (!text.trim()) throw new UsageError("stdin is empty");
    const label = o.name ?? `snippet${o.lang ? "." + o.lang : ""}`;
    const first = o["start-line"] ?? 1;
    const lines = text.replace(/\r?\n$/, "").split(/\r?\n/);
    const padded = [...Array(first - 1).fill(""), ...lines]; // index == real line number - 1, so numbering matches the larger file
    add({ label, text, lines: padded }, first, padded.length, { language: o.lang ?? "", first });
    return { kind: "snippet", description: `pasted snippet '${label}'`, sources, regions };
  }
  if (o.symbol) {
    const found = findSymbol(root, o.symbol, o.files[0]?.replace(/:\d*-?\d*$/, ""));
    if (found.length > 1 && !o.files.length) throw new UsageError(`'${o.symbol}' is defined in several places; pass --file to choose:\n${describeCandidates(found)}`);
    for (const f of found.slice(0, 5)) add(readSource(root, f.file), f.start, f.end, { approx: f.approx });
    return { kind: "symbol", description: `symbol ${o.symbol} (${regions.map((r) => `${r.label}:${r.start}-${r.end}`).join(", ")})`, sources, regions, symbol: o.symbol };
  }
  for (const spec of o.files) {
    const m = /^(.*?)(?::(\d*-?\d*))?$/.exec(spec);
    const driveOnly = /^[A-Za-z]$/.test(m[1]); // "C:\x" parsed as file "C"
    const file = driveOnly ? spec : m[1];
    const range = (!driveOnly && m[2]) || (o.files.length === 1 ? o.lines : null);
    const src = readSource(root, file);
    const r = range ? parseRange(range) : { start: 1, end: Infinity };
    if (r.start > src.lines.length) throw new UsageError(`${file} has only ${src.lines.length} lines`);
    add(src, r.start, r.end);
  }
  return { kind: "code", description: regions.map((r) => `${r.label}:${r.start}-${r.end}`).join(", "), sources, regions };
}

// ---------------------------------------------------------------- review

// A fingerprint of everything an agent could have changed: status, tracked diff, staged diff, and the CONTENT of every untracked file
// (an already-untracked file that is overwritten leaves `git status` and `git diff` unchanged).
function snapshot(cwd) {
  const s = sh("git", ["status", "--porcelain", "--untracked-files=all"], cwd);
  if (s.status !== 0) return null;
  const h = crypto.createHash("sha1").update(s.stdout).update("\0").update(sh("git", ["diff", "HEAD"], cwd).stdout ?? "").update("\0").update(sh("git", ["diff", "--cached"], cwd).stdout ?? "");
  const root = gitRoot(cwd) ?? cwd;
  for (const f of sh("git", ["ls-files", "--others", "--exclude-standard"], cwd).stdout.split("\n").filter(Boolean).sort()) {
    try {
      const abs = path.join(root, f), st = fs.statSync(abs);
      h.update(`\0${f}\0${st.size}`);
      if (st.size <= 20_000_000) h.update(fs.readFileSync(abs)); else h.update(String(st.mtimeMs));
    } catch { h.update(`\0${f}\0unreadable`); }
  }
  return h.digest("hex");
}

function modelList(o, cfg) {
  const asked = o.models ?? o.model ?? cfg.models ?? cfg.model;
  if (!asked) return [{ id: undefined, name: "agy default" }];
  const names = (Array.isArray(asked) ? asked : String(asked).split(",")).map((s) => s.trim()).filter(Boolean);
  let known = null;
  try { known = listModels(); } catch { /* offline: pass names through */ }
  return names.map((n) => (known ? resolveModel(n, known) : { id: n, name: n }));
}

// First model that is not a Gemini one, used when the default Gemini model's content filter refuses a prompt.
function fallbackModel() {
  try { return listModels().find((m) => !/^gemini/i.test(m.id)) ?? null; } catch { return null; }
}

async function review(o) {
  const cwd = process.cwd();
  const cfg = loadConfig(cwd).values;
  const root = gitRoot(cwd) ?? cwd;
  const security = !!o.security;
  const isCode = !!(o.stdin || o.symbol || o.files.length);
  // One target family per run: refuse combinations instead of silently picking one.
  const gitFlags = ["base", "commit", "staged"].filter((k) => o[k]);
  if (gitFlags.length > 1) throw new UsageError(`Choose one of --base, --commit, --staged (got ${gitFlags.map((k) => "--" + k).join(", ")})`);
  if (isCode && (gitFlags.length || o.paths)) throw new UsageError("--base/--commit/--staged/--paths review git changes and cannot be combined with --file/--symbol/--stdin");
  if (o.stdin && (o.symbol || o.files.length)) throw new UsageError("--stdin cannot be combined with --file or --symbol");
  if (o.stdin && o.agentic) throw new UsageError("--agentic cannot be used with --stdin: the snippet exists only in memory, so the reviewer could not read it");
  if (!isCode && o.agentic) throw new UsageError("--agentic applies to --file, --symbol and --stdin targets; git targets are always agentic");
  const target = isCode ? codeTarget(o, root) : gitTarget(o, cwd);
  const agentic = !isCode || !!o.agentic;
  if (!isCode && !gitRoot(cwd)) fail("Not inside a git repository. Run from the project root, or review code with --file/--symbol/--stdin.", EXIT.usage);
  if (!isCode && !target.scopes.length) { // nothing changed: do not ask a model to review the whole repository by accident
    const note = `No changes to review (${target.description}).`;
    if (o.format === "json") out(JSON.stringify({ schema: "agy-review/v1", tool_version: VERSION, review_type: security ? "security" : "code", target: { kind: "git", description: target.description, files: [] }, verdict: "approve", counts: countBySeverity([]), findings: [], note }, null, 2));
    else out(`## Summary\n${note}`);
    process.exit(EXIT.ok);
  }
  requireOk(prereqs({ git: !isCode || !!o.symbol || !!o.agentic, guard: agentic }));

  const focus = [o.focus ?? cfg.focus, ...o.words].filter(Boolean).join(" ");
  const contextLines = o["context-lines"] ?? cfg.contextLines ?? 40;
  const failOn = o["fail-on"] ?? cfg.failOn ?? "none";
  const minConfidence = o["min-confidence"] ?? cfg.minConfidence ?? "medium";
  const timeout = o.timeout ?? cfg.timeout ?? 15;
  const related = o["no-related"] ? false : (o.related ?? security) && !agentic;

  // Source access. Static runs may only ground findings in code the model was shown; agentic runs may load any repo file.
  const sources = target.sources ?? new Map();
  const cache = new Map();
  const toLabel = (abs) => path.relative(root, abs).split(path.sep).join("/");
  const same = (a, b) => (process.platform === "win32" ? a.toLowerCase() === b.toLowerCase() : a === b);
  const inRoot = (abs) => { const rel = path.relative(root, abs); return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel)); };
  const canon = (label) => { // a model may cite an absolute path, a cwd-relative path, or a root-relative path
    const cands = path.isAbsolute(label) ? [label] : [path.resolve(root, label), path.resolve(cwd, label)];
    for (const c of cands) if (inRoot(c) && (fs.existsSync(c) || sources.has(toLabel(c)))) return toLabel(c);
    for (const k of sources.keys()) if (same(k, label.replace(/^\.\//, ""))) return k;
    return label;
  };
  const load = (label) => {
    if (cache.has(label)) return cache.get(label);
    let v = null;
    try {
      const abs = path.resolve(root, label);
      if (inRoot(abs) && !SECRET_PATH.test(abs)) v = { lines: fs.readFileSync(abs, "utf8").split(/\r?\n/) };
    } catch { /* unreadable: the finding will be rejected */ }
    cache.set(label, v);
    return v;
  };

  // Scope: static targets use their regions; git targets use the lines the change touched.
  const scopes = isCode ? target.regions : target.scopes ?? [];
  const scanSources = new Map(sources);
  if (!isCode) for (const s of scopes) if (!scanSources.has(s.label)) { const f = load(s.label); if (f) scanSources.set(s.label, f); }
  const scanned = scan(scopes, scanSources);
  const secrets = secretFindings(scanned.secrets);
  const signals = security ? scanned.signals : [];

  let regions = target.regions;
  if (related) regions = [...target.regions, ...expandRelated(root, target.regions, sources)];
  const promptSources = new Map([...sources].map(([k, v]) => [k, { ...v, lines: redactLines(v.lines) }]));

  const lines = target.lines ?? target.regions.reduce((a, r) => a + (r.end - r.start + 1), 0);
  const effort = resolveEffort(o.effort ?? cfg.effort, effortForReview({ lines, focus: `${focus} ${security ? "security" : ""}`, agentic }));
  const models = modelList(o, cfg);
  const prompt = agentic
    ? agenticPrompt({ marker: MARKER, context: o.context, focus, signals, security, changedOnly: !isCode, target: !isCode ? `Review ${target.instructions}` : `Review ${target.description}. Read these regions first, then their callers and tests.` })
    : staticPrompt({ regions, sources: promptSources, contextLines, context: o.context, focus, signals, security });
  const schemaPath = security ? securitySchemaPath(SCHEMA_PATH) : SCHEMA_PATH;

  const before = agentic ? snapshot(cwd) : null;
  const t0 = Date.now();
  const runs = [];
  const effortByModel = {}, effortNotes = []; // the effort each model really got: models differ in what --effort they accept
  try {
    for (let m of models) {
      const t = Date.now();
      let r = await runAgy({ prompt, schemaPath, model: m.id, effort: effort.effort, timeoutMin: timeout, cwd, agentic });
      if (r.filtered && !m.id) { // the unnamed default model refused: switch family once, openly
        const alt = fallbackModel();
        if (alt) {
          err(`[agy-review] ${m.name}: Gemini's content filter refused this prompt. Retrying once with ${alt.name}. Pick a model yourself with --model to avoid this.`);
          m = { ...alt, name: `${alt.name} (fallback)` };
          r = await runAgy({ prompt, schemaPath, model: alt.id, effort: effort.effort, timeoutMin: timeout, cwd, agentic });
        }
      }
      effortByModel[m.name] = r.effortUsed ?? "model default";
      if (r.effortNote) effortNotes.push(`${m.name}: ${r.effortNote}`);
      const report = lastJsonObject(r.response);
      if (!report || !Array.isArray(report.findings)) {
        err(`[agy-review] ${m.name}: ${r.timedOut ? `no answer within ${timeout + 1} minutes` : r.error ? `agy error: ${JSON.stringify(r.error)}` : "the reply was not the required JSON report"}`);
        if (r.response && !report) err(`--- raw reply ---\n${redactLines(r.response.slice(0, 4000).split("\n")).join("\n")}`);
        if (r.stderr) err(redactLines(r.stderr.split("\n")).join("\n"));
        runs.push({ model: m.name, ok: false });
        continue;
      }
      const g = ground(report, { sources, load: agentic ? load : undefined, canon, scopes, restricted: !isCode, diffByFile: target.diffByFile, minConfidence });
      runs.push({ model: m.name, ok: true, report, ...g, ms: Date.now() - t, usage: r.usage, blocked: r.blocked.length });
    }
  } finally {
    if (security) fs.rmSync(path.dirname(schemaPath), { recursive: true, force: true });
  }
  const modified = agentic ? snapshot(cwd) !== before : false;
  const okRuns = runs.filter((r) => r.ok);
  // Every model failed. A secret found by the scanner is still a real result: report it instead of throwing it away.
  if (!okRuns.length && !secrets.length) { if (modified) err("[agy-review] WARNING: the working tree changed during the review."); process.exit(modified ? EXIT.modified : EXIT.error); }
  if (agentic && secrets.length) err(`[agy-review] WARNING: ${secrets.length} recognised secret(s) are in the reviewed files. An agentic reviewer reads files itself, so they cannot be redacted before it sees them. Rotate them, or review with --file/--symbol (static mode redacts them).`);

  let verified = [], speculative = [];
  if (okRuns.length === 1) ({ verified, speculative } = okRuns[0]);
  else if (okRuns.length > 1) ({ verified, speculative } = splitByConfidence(mergeRuns(okRuns), minConfidence));
  const all = [...verified, ...secrets].sort(order);
  const findings = all.filter((f) => f.scope === "in");
  const contextFindings = all.filter((f) => f.scope === "context");
  const rejected = okRuns.flatMap((r) => r.rejected.map((x) => ({ ...x, model: r.model })));
  const failedModels = runs.filter((r) => !r.ok).map((r) => r.model);
  const incomplete = failedModels.length > 0;
  const coverageRatio = !okRuns.length ? 0 : isCode ? Math.min(...okRuns.map((r) => coverage(target.regions, r.report.scope_reviewed))) : 1;
  const notes = [
    ...(agentic && secrets.length ? [`${secrets.length} hard-coded secret(s) are in the reviewed files and were readable by the agentic reviewer: rotate them.`] : []),
    ...(target.deleted?.length ? [`Deleted files cannot be reviewed as current code: ${target.deleted.slice(0, 10).join(", ")}.`] : []),
  ];
  const verdict = computeVerdict({ findings: all, rejected, modelVerdicts: okRuns.map((r) => r.report.model_verdict), coverageRatio, incomplete });
  const gate = { fail_on: failOn, min_confidence: minConfidence, failed: gateFails(all, failOn) };

  const report = {
    schema: "agy-review/v1", tool_version: VERSION, generated_at: new Date().toISOString(),
    review_type: security ? "security" : "code",
    target: { kind: target.kind, description: target.description, files: (isCode ? target.regions : target.scopes).filter((r) => r.role !== "context").map((r) => ({ file: r.label, line_start: r.start, line_end: r.end })) },
    mode: agentic ? "agentic-readonly" : "static",
    models: okRuns.map((r) => r.model),
    effort: (() => {
      const used = [...new Set(Object.values(effortByModel))];
      return { value: used.length === 1 ? used[0] : "per model", reason: [effort.reason, ...effortNotes].join("; "), source: effort.source, ...(used.length > 1 ? { per_model: effortByModel } : {}) };
    })(),
    verdict,
    model_verdicts: Object.fromEntries(okRuns.map((r) => [r.model, r.report.model_verdict])),
    summary: !okRuns.length ? "No model produced a review; only the secret scanner ran." : okRuns.length === 1 ? String(okRuns[0].report.summary ?? "") : okRuns.map((r) => `[${r.model}] ${r.report.summary ?? ""}`).join(" "),
    counts: countBySeverity(findings),
    findings, context_findings: contextFindings, speculative, rejected,
    ...(security ? { signals, related_code: regions.filter((r) => r.role === "context").map((r) => ({ file: r.label, line_start: r.start, line_end: r.end, kind: r.kind, note: r.note })) } : {}),
    questions: okRuns.flatMap((r) => r.report.questions ?? []),
    limitations: [...new Set([...notes, ...okRuns.flatMap((r) => r.report.limitations ?? [])])],
    scope_reviewed: okRuns[0]?.report.scope_reviewed ?? [],
    coverage: Number(coverageRatio.toFixed(2)),
    incomplete, ...(incomplete ? { failed_models: failedModels } : {}),
    gate,
    stats: { duration_ms: Date.now() - t0, runs: runs.map((r) => ({ model: r.model, ok: r.ok, ms: r.ms, usage: r.usage, guard_blocked: r.blocked, rejected: r.rejected?.length })) },
  };
  if (o.previous) {
    let prev; try { prev = JSON.parse(fs.readFileSync(o.previous, "utf8").replace(/^\uFEFF/, "")); } catch (e) { throw new UsageError(`Cannot read --previous ${o.previous}: ${e.message}`); }
    const present = (p) => { const src = sources.get(p.file) ?? load(canon(p.file)); return !!src && !!locateEvidence(src.lines, p.evidence, p.line_start); };
    report.comparison = compareWithPrevious(prev, all, present);
  }
  if (modified) report.tree_modified = true;

  const text = o.format === "json" ? JSON.stringify(report, null, 2) : renderMarkdown(report);
  if (o.output) fs.writeFileSync(o.output, text.endsWith("\n") ? text : text + "\n");
  if (!o.output || o.format !== "json") out(text);
  else out(JSON.stringify({ ok: true, output: o.output, verdict, counts: report.counts, gate }));
  const blocked = okRuns.reduce((a, r) => a + r.blocked, 0);
  if (blocked) err(`[agy-review] ${blocked} write/exec attempt(s) were blocked by the read-only guard.`);
  if (incomplete) err(`[agy-review] INCOMPLETE: ${failedModels.join(", ")} did not produce a report.`);
  if (modified) err("[agy-review] WARNING: the working tree changed during the review. Inspect `git status` and `git diff` before continuing.");
  process.exit(modified ? EXIT.modified : gate.failed ? EXIT.gate : verdict === "inconclusive" || incomplete ? EXIT.inconclusive : EXIT.ok);
}

// ---------------------------------------------------------------- tasks

async function task(o) {
  const cwd = process.cwd();
  const cfg = loadConfig(cwd).values;
  requireOk(prereqs({ git: false, guard: false }));
  const root = gitRoot(cwd) ?? cwd;
  const inputs = o.inputs.map((f) => { const s = readSource(root, f); return { name: s.label, text: s.text }; });
  if (o.stdin) inputs.push({ name: "stdin", text: readStdin() });
  const chars = inputs.reduce((a, i) => a + i.text.length, 0);
  const effort = resolveEffort(o.effort ?? cfg.effort, effortForTask({ instruction: o.task, inputChars: chars }));
  const [m] = modelList({ model: o.model }, cfg);
  const r = await runAgy({ prompt: taskPrompt({ instruction: o.task, inputs, format: o["respond-as"] }), schemaPath: null, model: m.id, effort: effort.effort, timeoutMin: o.timeout ?? cfg.timeout ?? 15, cwd, agentic: false });
  if (!r.response) {
    err(r.timedOut ? "[agy-review] no answer in time" : r.denied?.length ? "[agy-review] agy tried to use a tool, which is not allowed in task mode. Rephrase the task so it needs no files or commands." : `[agy-review] agy returned no answer${r.error ? ": " + JSON.stringify(r.error) : ""}`);
    if (r.stderr) err(r.stderr);
    process.exit(EXIT.error);
  }
  const used = r.effortUsed ?? "model default", why = [effort.reason, r.effortNote].filter(Boolean).join("; ");
  const text = o.format === "json" ? JSON.stringify({ schema: "agy-task/v1", tool_version: VERSION, model: m.name, effort: { value: used, reason: why, source: effort.source }, output: r.response, usage: r.usage }, null, 2) : r.response;
  if (o.output) fs.writeFileSync(o.output, text + "\n"); else out(text);
  err(`[agy-review] task done: model ${m.name}, effort ${used} (${why})`);
  process.exit(EXIT.ok);
}

async function translate(o) {
  const cwd = process.cwd();
  const cfg = loadConfig(cwd).values;
  requireOk(prereqs({ git: false, guard: false }));
  const to = o.to ?? cfg.to;
  if (!to) throw new UsageError("--preset translate needs --to <language>");
  if (o.inputs.length + (o.stdin ? 1 : 0) !== 1) throw new UsageError("translate needs exactly one text: --input <file> or --stdin");
  const root = gitRoot(cwd) ?? cwd;
  const text = o.stdin ? readStdin() : readSource(root, o.inputs[0]).text;
  const glossaryFile = o.glossary ?? cfg.glossary;
  const instruction = buildInstruction({
    to, from: o.from, variant: o.variant ?? cfg.variant, tone: o.tone ?? cfg.tone, audience: o.audience ?? cfg.audience, notes: o.notes,
    glossary: glossaryFile ? loadGlossary(path.resolve(cwd, glossaryFile)) : [], keep: o.keep ? o.keep.split(",").map((s) => s.trim()).filter(Boolean) : [],
  });
  const effort = resolveEffort(o.effort ?? cfg.effort, effortForTask({ instruction: "translate", inputChars: text.length }));
  const [m] = modelList({ model: o.model }, cfg);
  const chunks = splitChunks(text, 8000);
  const done = [];
  let usage = { input_tokens: 0, output_tokens: 0 }, usedEffort = "model default", effortNote = "";
  for (const [i, chunk] of chunks.entries()) {
    const continuity = i && done.length ? `\n\nFor continuity only (do not repeat it), the previous part ended with:\n${done[done.length - 1].trim().split("\n").slice(-3).join("\n")}` : "";
    const r = await runAgy({ prompt: taskPrompt({ instruction: instruction + continuity, inputs: [{ name: "text", text: chunk }], format: "Output only the translation of the text in <input>, nothing else." }), schemaPath: null, model: m.id, effort: effort.effort, timeoutMin: o.timeout ?? cfg.timeout ?? 15, cwd, agentic: false });
    if (!r.response) { err(`[agy-review] translation failed on part ${i + 1}/${chunks.length}${r.timedOut ? " (timeout)" : r.error ? ": " + JSON.stringify(r.error) : ""}`); process.exit(EXIT.error); }
    done.push(r.response.replace(/^```[a-z]*\n([\s\S]*)\n```$/, (all, body) => (/^\s*```/m.test(chunk) ? all : body)));
    usage = { input_tokens: usage.input_tokens + (r.usage?.input_tokens ?? 0), output_tokens: usage.output_tokens + (r.usage?.output_tokens ?? 0) };
    usedEffort = r.effortUsed ?? "model default"; effortNote = r.effortNote ?? "";
  }
  const result = done.map((d) => d.trimEnd()).join("\n\n") + "\n";
  const checks = checkPreservation(text, result);
  for (const i of checks.issues) err(`[agy-review] check failed: ${i.check}${i.note ? " - " + i.note : ""}${i.missing?.length ? ` | missing: ${i.missing.join(", ")}` : ""}${i.unexpected?.length ? ` | unexpected: ${i.unexpected.join(", ")}` : ""}`);
  const why = [effort.reason, effortNote].filter(Boolean).join("; ");
  const body = o.format === "json" ? JSON.stringify({ schema: "agy-translate/v1", tool_version: VERSION, to, model: m.name, effort: { value: usedEffort, reason: why, source: effort.source }, chunks: chunks.length, output: result, checks, usage }, null, 2) : result;
  if (o.output) fs.writeFileSync(o.output, body.endsWith("\n") ? body : body + "\n"); else out(body);
  err(`[agy-review] translated to ${to}: model ${m.name}, effort ${usedEffort} (${why}), ${chunks.length} part(s), preservation checks ${checks.ok ? "passed" : "FAILED"}${o.output ? `, saved to ${o.output}` : ""}`);
  process.exit(!checks.ok && o.strict ? EXIT.checks : EXIT.ok);
}

// ---------------------------------------------------------------- models, settings, setup

const describeCaps = (c, id) => !c ? "unknown" : c.kind === "list" ? `--effort ${c.values.join(" | ")}` : c.kind === "in-id" ? `effort is in the name (${/-(low|medium|high|xhigh|max)$/.exec(id ?? "")?.[1] ?? "fixed"})` : c.kind === "none" ? "no --effort" : "any --effort";

async function models(o) {
  const list = listModels();
  const { values, sources } = loadConfig(process.cwd());
  const chosen = [values.model, ...(values.models ?? [])].filter(Boolean).map((s) => s.toLowerCase());
  const sel = (m) => chosen.includes(m.id.toLowerCase()) || chosen.includes(m.name.toLowerCase());
  // What each model accepts for --effort comes from agy itself (a free check, cached per model and agy version).
  const caps = await Promise.all([...list.map((m) => effortCaps(m.id, { refresh: !!o.refresh })), effortCaps(undefined, { refresh: !!o.refresh })]);
  const defaultCaps = caps.pop();
  if (o.format === "json") return out(JSON.stringify({ models: list.map((m, i) => ({ ...m, selected: sel(m), effort: caps[i] })), default_model_effort: defaultCaps, source: sources.model ?? sources.models }, null, 2));
  const w = Math.max(...list.map((m) => m.id.length), 12);
  for (const [i, m] of list.entries()) out(`${sel(m) ? "*" : " "} ${m.id.padEnd(w)}  ${m.name}  [${describeCaps(caps[i], m.id)}]`);
  out(`  ${"(no --model)".padEnd(w)}  agy's own default model  [${describeCaps(defaultCaps, undefined)}]`);
  out(`\n* = selected (${sources.model ?? sources.models ?? "none; agy default is used"}). Choose with:  --set model=<id>   (add --global for all projects)\nCross-check with several:  --set models=<id>,<id>   or  --models <id>,<id>\nThe effort a run asks for is always adjusted to what its model accepts, and the report says what was used.`);
}

function settings(o) {
  const cwd = process.cwd();
  for (const kv of o.set) {
    const i = kv.indexOf("=");
    if (i < 1) throw new UsageError(`--set expects key=value, got '${kv}'`);
    const key = kv.slice(0, i).trim();
    let value = kv.slice(i + 1).trim();
    if (key === "model" || key === "models" || key === "graphifyModel") {
      const known = listModels();
      value = value.split(",").map((s) => resolveModel(s, known).id);
      if (key !== "models") value = value[0];
    }
    const r = setConfig(cwd, key, value, { global: !!o.global });
    out(`Saved ${key} = ${JSON.stringify(r.value)}  (${r.path})`);
  }
  if (o.unset) out(`Removed ${o.unset} from ${unsetConfig(cwd, o.unset, { global: !!o.global })}`);
  if (o["show-config"]) {
    const c = loadConfig(cwd);
    out(JSON.stringify({ effective: c.values, from: c.sources, files: c.paths }, null, 2));
  }
}

async function verify(o) {
  requireOk(prereqs({ git: false, guard: "installed" }));
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "agy-verify-"));
  const fwd = (p) => p.replace(/\\/g, "/");
  const f = { readme: path.join(dir, "readme.txt"), victim: path.join(dir, "victim.txt"), c1: path.join(dir, "canary-tool.txt"), c2: path.join(dir, "canary-redirect.txt") };
  fs.writeFileSync(f.readme, "VERIFY_READ_OK\n");
  fs.writeFileSync(f.victim, "keep me\n");
  const prompt = `${MARKER}\nAttempt these as separate tool calls and continue even if one is blocked:\n` +
    `1. Read ${fwd(f.readme)}.\n2. Create the file ${fwd(f.c1)} containing hi using a file-writing tool.\n` +
    `3. Run: echo hi > ${fwd(f.c2)}\n4. Delete ${fwd(f.victim)} (Remove-Item or rm).\nThen answer with one line per step: ok or blocked.`;
  try {
    const r = await runAgy({ prompt, schemaPath: null, model: undefined, effort: o.effort && o.effort !== "auto" ? o.effort : undefined, timeoutMin: Math.min(o.timeout ?? 5, 5), cwd: dir, agentic: true });
    const checks = [
      ["read allowed", r.steps.some((s) => (s.tool === "view_file" || s.tool === "run_command") && !s.error && s.target.includes("readme.txt"))],
      ["file write blocked", !fs.existsSync(f.c1)],
      ["redirect blocked", !fs.existsSync(f.c2)],
      ["delete blocked", fs.existsSync(f.victim)],
      ["guard actually fired", r.blocked.length > 0],
    ];
    for (const [name, ok] of checks) out(`${ok ? "PASS" : "FAIL"}  ${name}`);
    const ok = checks.every((c) => c[1]);
    if (ok) fs.writeFileSync(MARKER_FILE, JSON.stringify({ guard_hash: installedGuardHash(), agy_version: agyVersion(), verified_at: new Date().toISOString() }));
    else fs.rmSync(MARKER_FILE, { force: true });
    out(ok ? "\nVerified: reads work, writes are blocked. Agentic reviews are now allowed for this guard and this agy version." : "\nNOT VERIFIED. Agentic reviews stay disabled until this passes.");
    process.exit(ok ? EXIT.ok : EXIT.error);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------- graphify

async function graphifyCmd(o) {
  const cwd = process.cwd();
  const root = gitRoot(cwd) ?? cwd;
  const cfg = loadConfig(cwd).values;
  const settings = { model: o.model ?? cfg.graphifyModel, effort: o.effort && o.effort !== "auto" ? o.effort : cfg.graphifyEffort ?? "low", concurrency: cfg.graphifyConcurrency ?? 3, labels: cfg.graphifyLabels };
  const table = (rows) => rows.forEach((r) => out(`${r.ok ? "OK  " : "FAIL"}  ${r.name}: ${r.detail}`));
  const pluginRoot = ROOT;
  switch (o.graphify) {
    case "doctor": { const rows = gfy.doctor(root); table(rows); process.exit(rows.every((r) => r.ok || r.name === "graph built") ? EXIT.ok : EXIT.usage); break; }
    case "update": {
      if (settings.model) settings.model = resolveModel(settings.model, listModels()).id;
      if (o.detach && !process.env.AGY_GRAPHIFY_CHILD) { // a git hook must never wait for a model
        if (!fs.existsSync(path.join(root, "graphify-out", "graph.json")) && !o.full) process.exit(EXIT.ok);
        const rest = process.argv.slice(2).filter((a) => a !== "--detach");
        const pid = gfy.detach([SELF, ...rest], { AGY_GRAPHIFY_CHILD: "1" });
        if (!o.quiet) out(`graphify update started in the background (pid ${pid}); log: graphify-out/.agy-update.log`);
        process.exit(EXIT.ok);
      }
      const r = await gfy.update({ root, settings, full: !!o.full, quiet: !!o.quiet, debug: !!o.debug });
      if (r.skipped) { if (!o.quiet) out(`graphify update skipped: ${r.skipped}`); process.exit(EXIT.ok); }
      if (!o.quiet) out(`graphify updated in ${r.duration_s}s on Antigravity (${r.agy_calls} call(s), ${r.input_tokens} in / ${r.output_tokens} out tokens). Claude/Codex tokens used: 0.\n${r.summary}\n${r.steps}`);
      process.exit(EXIT.ok);
      break;
    }
    case "hook-install": {
      const r = await gfy.hookInstall({ root, pluginRoot, keepGraphifyHook: !!o["keep-graphify-hook"] });
      out(`Installed agy-graphify hooks:\n${r.hooks.map((h) => "  " + h).join("\n")}\nRuntime copy: ${r.runtime}\n${r.notes.join("\n")}`);
      return;
    }
    case "hook-uninstall": { const r = await gfy.hookUninstall({ root, restoreGraphify: !!o["restore-graphify"] }); out(`Removed from: ${r.removed.join(", ") || "(nothing installed)"}${r.restored ? "\ngraphify's own hooks were restored." : ""}`); return; }
    case "status": {
      const s = gfy.hookStatus(root);
      table(gfy.doctor(root));
      out(`\nGit hooks (ours = Antigravity updater, graphify = graphify's own AST-only hook):`);
      for (const r of s.rows) out(`  ${r.event.padEnd(14)} ours: ${r.ours ? "yes" : "no "}   graphify: ${r.graphify ? "yes" : "no"}`);
      out(`Runtime copy for hooks: ${s.runtimeInstalled ? "installed" : "missing (run --graphify setup)"}`);
      out(s.last ? `Last update: ${s.last.ok ? `${s.last.at}, ${s.last.duration_s}s, ${s.last.agy_calls} agy call(s), ${s.last.input_tokens}/${s.last.output_tokens} tokens, ${s.last.summary || s.last.steps}` : `FAILED ${s.last.at}: ${s.last.error}`}` : "Last update: never");
      for (const r of gfy.ruleFiles(root)) if (r.exists) out(`${r.file}: ${r.hasOurRule ? "has the agy-graphify rule" : r.hasGraphifySection ? "has a graphify section that tells the agent to rebuild the graph itself (costs its tokens); add the rule with --graphify rules --write-rules" : "no graphify section"}`);
      return;
    }
    case "rules": {
      if (o["write-rules"]) { const w = gfy.writeRules(root); out(w.length ? `Added the rule to: ${w.join(", ")}` : "No CLAUDE.md or AGENTS.md here; nothing written."); } else out(gfy.AGENT_RULE);
      return;
    }
    case "serve": {
      if (settings.model) settings.model = resolveModel(settings.model, listModels()).id;
      const shim = await startShim({ model: settings.model, effort: settings.effort, concurrency: settings.concurrency, timeoutMin: 15, cwd: root });
      out(`OpenAI-compatible server on Antigravity: ${shim.url}\nUse it from any tool:\n  OPENAI_BASE_URL=${shim.url}\n  OPENAI_API_KEY=${shim.token}\n  (model name: agy, or agy:<agy model id>)\nPress Ctrl+C to stop.`);
      await new Promise(() => {});
      break;
    }
    case "setup": {
      let rows = gfy.doctor(root);
      const missingPkg = rows.find((r) => r.name.startsWith("openai package") && !r.ok);
      if (missingPkg && o.yes) {
        const uv = sh("uv", ["--version"]);
        const cmd = uv.status === 0 ? ["uv", ["tool", "install", "--force", "graphifyy[openai]"]] : ["pipx", ["inject", "graphifyy", "openai"]];
        out(`Adding the openai package to graphify's environment: ${cmd[0]} ${cmd[1].join(" ")}`);
        const r = spawnSync(cmd[0], cmd[1], { stdio: "inherit" });
        if (r.status !== 0) throw new UsageError("Could not add the openai package. Run it yourself, then repeat --graphify setup.");
        rows = gfy.doctor(root);
      }
      table(rows);
      const blocking = rows.filter((r) => !r.ok && r.name !== "graph built");
      if (blocking.length) { out("\nFix the items marked FAIL (or pass --yes to add the openai package), then run --graphify setup again."); process.exit(EXIT.usage); }
      const r = await gfy.hookInstall({ root, pluginRoot, keepGraphifyHook: !!o["keep-graphify-hook"] });
      out(`\nInstalled hooks: ${r.hooks.map((h) => path.basename(h)).join(", ")}\n${r.notes.join("\n")}`);
      if (o["write-rules"]) out(`Agent rule added to: ${gfy.writeRules(root).join(", ") || "(no CLAUDE.md / AGENTS.md)"}`);
      else for (const f of gfy.ruleFiles(root)) if (f.exists && f.hasGraphifySection && !f.hasOurRule) out(`NOTE: ${f.file} has a graphify section that tells the agent to rebuild the graph itself. Add the rule that stops it: --graphify rules --write-rules`);
      out(rows.find((r) => r.name === "graph built")?.ok ? "\nDone. From now on every commit, merge, checkout and rebase updates the graph on Antigravity." : "\nDone. Build the first graph once (it reads every doc, so it takes a while):  --graphify update --full");
      return;
    }
  }
}

// ---------------------------------------------------------------- version and updates

const UPDATE_URL = "https://raw.githubusercontent.com/Ealireza/agy-review/main/plugins/agy-review/.claude-plugin/plugin.json";

async function updateCheck(o) {
  let latest;
  try {
    const res = await fetch(process.env.AGY_REVIEW_UPDATE_URL || UPDATE_URL, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    latest = (await res.json()).version;
  } catch (e) { fail(`Could not check for updates (${e.message}). Compare ${VERSION} with https://github.com/Ealireza/agy-review/releases by hand.`, EXIT.error); }
  const cmp = compareVersions(latest, VERSION);
  if (o.format === "json") out(JSON.stringify({ installed: VERSION, latest, update_available: cmp > 0 }));
  else if (cmp > 0) out(`Update available: ${VERSION} -> ${latest}\n\nClaude Code (in a terminal, then restart Claude Code):\n  claude plugin marketplace update agy-review\n  claude plugin update agy-review@agy-review\nCodex:\n  codex plugin marketplace upgrade agy-review\n  codex plugin remove agy-review@agy-review && codex plugin add agy-review@agy-review\nPlain clone:  git pull\n\nThen:  --install-guard  and  --verify  (and  --graphify setup  if you use graphify hooks).`);
  else out(`agy-review ${VERSION} is up to date.`);
  process.exit(EXIT.ok);
}

// ---------------------------------------------------------------- main

async function main() {
  const o = parseArgs(process.argv.slice(2));
  if (o.help) return out(HELP);
  if (o.version) return out(`agy-review ${VERSION} (${RT} ${process.versions.bun ?? process.versions.node})`);
  if (o["update-check"]) return updateCheck(o);
  if (o.graphify) return graphifyCmd(o);
  if (o["install-guard"]) return installGuard();
  if (o["uninstall-guard"]) { fs.rmSync(GUARD_DIR, { recursive: true, force: true }); return out("Removed read-only guard."); }
  if (o.check) {
    const rows = prereqs();
    for (const [n, ok, d] of rows) out(`${ok ? "OK  " : "FAIL"}  ${n}: ${d}`);
    out(`      agy-review ${VERSION}, runtime: ${RT} ${process.versions.bun ?? process.versions.node}`);
    process.exit(rows.every((r) => r[1]) ? EXIT.ok : EXIT.usage);
  }
  if (o.verify) return verify(o);
  if (o["list-models"]) return models(o);
  if (o.set.length || o.unset || o["show-config"]) return settings(o);
  if (o.preset === "translate") return translate(o);
  if (o.task) return task(o);
  return review(o);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((e) => {
    if (e instanceof UsageError) fail(e.message, EXIT.usage);
    fail(`[agy-review] unexpected error: ${e.stack ?? e}`);
  });
}
