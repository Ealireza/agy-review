// Review targets that are not "the git diff": a file, a line range, a function by name, or a pasted snippet.
// The wrapper reads and numbers the code itself, so the model never has to guess a line number.
import fs from "node:fs";
import path from "node:path";
import { SECRET_PATH, UsageError, sh } from "./util.mjs";

const MAX_BYTES = 400_000;
const SOURCE_EXT = /\.(py|pyi|js|mjs|cjs|jsx|ts|tsx|java|kt|kts|scala|groovy|cs|go|rs|c|h|cc|cpp|cxx|hpp|hh|m|mm|swift|php|rb|lua|dart|sh|ps1|psm1|sql|vue|svelte)$/i;
const CODE_LANG = { py: "python", pyi: "python", js: "javascript", mjs: "javascript", cjs: "javascript", jsx: "javascript", ts: "typescript", tsx: "typescript", java: "java", kt: "kotlin", kts: "kotlin", cs: "csharp", go: "go", rs: "rust", c: "c", h: "c", cpp: "cpp", cc: "cpp", cxx: "cpp", hpp: "cpp", swift: "swift", php: "php", rb: "ruby", sh: "shell", ps1: "powershell", sql: "sql", dart: "dart", scala: "scala", lua: "lua" };

export const langOf = (file) => CODE_LANG[path.extname(file).slice(1).toLowerCase()] ?? "";

export function parseRange(spec) {
  const m = /^(\d+)?(?:[-:](\d+)?)?$/.exec(String(spec).trim());
  if (!m || (!m[1] && !m[2])) throw new UsageError(`Bad --lines '${spec}'. Use 40-80, 40- or 40`);
  if (m[1] && +m[1] < 1) throw new UsageError(`Bad --lines '${spec}': line numbers start at 1`);
  const start = m[1] ? +m[1] : 1;
  const end = m[2] ? +m[2] : /[-:]/.test(spec) ? Infinity : start;
  if (end < start) throw new UsageError(`Bad --lines '${spec}': end before start`);
  return { start, end };
}

export function readSource(root, file) {
  const abs = path.resolve(root, file);
  if (SECRET_PATH.test(abs)) throw new UsageError(`Refusing to send a credential path to a model: ${file}`);
  let text;
  try { text = fs.readFileSync(abs, "utf8"); } catch (e) { throw new UsageError(`Cannot read ${file}: ${e.code ?? e.message}`); }
  if (text.includes("\0")) throw new UsageError(`${file} looks binary`);
  if (Buffer.byteLength(text) > MAX_BYTES) throw new UsageError(`${file} is larger than ${MAX_BYTES / 1000} KB; narrow it with --lines or --symbol`);
  const rel = path.relative(root, abs).split(path.sep).join("/");
  return { label: rel.startsWith("..") ? abs.split(path.sep).join("/") : rel, abs, text, lines: text.split(/\r?\n/) };
}

// ---------- symbol location ----------

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// A line only counts as a definition if it has a definition keyword/modifier, or ends like a signature. Calls never match.
const NOT_DEF = /^\s*(?:return|await|yield|throw|else|if|while|for|switch|catch|elif|with|new|delete|typeof|\}|=|\.|,|\+|-|&&|\|\|)/;
const MODS = "(?:public|private|protected|internal|static|final|abstract|override|virtual|async|export|default|inline|extern|unsafe|suspend|open|sealed|partial|readonly|const|constexpr|operator|fun|function)";
function definitionRegexes(name, ext) {
  const n = esc(name);
  const generic = "(?:<[^>()]*>)?";
  const py = /^(py|pyi)$/.test(ext);
  const regs = [
    new RegExp(`\\b(?:def|fun|func|function|fn|sub|proc|method|class|struct|interface|object|enum|trait|impl|type|protocol|record|module|namespace)\\s+(?:[\\w.<>\\[\\]]+\\.)?${n}\\b`),
  ];
  if (py) return regs;
  regs.push(
    new RegExp(`\\bfunc\\s*\\([^)]*\\)\\s*${n}\\s*${generic}\\s*\\(`),                                              // Go method with receiver
    new RegExp(`\\b${n}\\s*[:=]\\s*(?:async\\s+)?(?:function\\b|\\([^)]*\\)\\s*(?::\\s*[\\w<>\\[\\]|]+\\s*)?=>|\\w+\\s*=>)`), // const f = () =>
    new RegExp(`^\\s*(?:${MODS}\\s+)+(?:[\\w:<>,\\[\\]*&?.]+\\s+)*${n}\\s*${generic}\\s*\\(`),                         // modifiers ... name(
    new RegExp(`^\\s*(?:[\\w:<>,\\[\\]*&?.]+\\s+)+${n}\\s*${generic}\\s*\\([^;]*(?:\\)\\s*(?:const|override|noexcept|throws[\\w\\s,.]*)?\\s*\\{?\\s*$|,\\s*$)`), // C-like: type name(...) {
    new RegExp(`^\\s*${n}\\s*${generic}\\s*\\([^;]*\\)\\s*(?::\\s*[\\w<>\\[\\]|.]+\\s*)?\\{\\s*$`),                        // JS/TS method: name(args) {
  );
  return regs;
}

// Walks forward from `from` and returns the index (line, 0-based) of the closing brace of the first block, skipping strings and comments.
function matchBraces(lines, from, maxScan = 4000) {
  let depth = 0, started = false, inBlock = false, str = null;
  for (let i = from; i < Math.min(lines.length, from + maxScan); i++) {
    const l = lines[i];
    for (let j = 0; j < l.length; j++) {
      const c = l[j], d = l[j + 1];
      if (inBlock) { if (c === "*" && d === "/") { inBlock = false; j++; } continue; }
      if (str) { if (c === "\\") j++; else if (c === str) str = null; continue; }
      if (c === "/" && d === "*") { inBlock = true; j++; continue; }
      if (c === "/" && d === "/") break;
      if (c === '"' || c === "'" || c === "`") { str = c === "'" && /\w/.test(l[j - 1] ?? "") ? null : c; continue; }
      if (c === "{") { depth++; started = true; }
      else if (c === "}" && started && --depth === 0) return i;
    }
    if (str && str !== "`") str = null; // plain strings end at the line end
  }
  return -1;
}

function blockEnd(lines, i, ext) {
  const indent = (s) => s.match(/^\s*/)[0].replace(/\t/g, "    ").length;
  if (/^(py|pyi)$/.test(ext)) {
    let sig = i;
    while (sig < lines.length - 1 && !/:\s*(#.*)?$/.test(lines[sig])) sig++;
    const base = indent(lines[i]);
    let end = sig;
    for (let k = sig + 1; k < lines.length; k++) {
      if (!lines[k].trim()) continue;
      if (indent(lines[k]) <= base) break;
      end = k;
    }
    return { end, approx: false };
  }
  // Kotlin/Scala/Swift expression body: `fun f() = expr` has no braces of its own; do not borrow the next function's.
  if (/\)\s*(?::\s*[\w<>\[\]?.,\s]+)?=(?![=>])/.test(lines[i]) && !lines[i].includes("{")) {
    let end = i;
    while (end < lines.length - 1 && end - i < 12 && lines[end + 1].trim()) end++;
    return { end, approx: true };
  }
  for (let k = i; k < Math.min(lines.length, i + 8); k++) {
    if (lines[k].includes("{")) {
      const e = matchBraces(lines, k);
      if (e >= 0) return { end: e, approx: false };
      break;
    }
    if (/;\s*$/.test(lines[k]) && k > i) break;
  }
  let end = i;
  while (end < lines.length - 1 && end - i < 12 && lines[end + 1].trim()) end++;
  return { end, approx: true };
}

function withLeadingDocs(lines, i) {
  let s = i;
  while (s > 0 && i - s < 25 && /^\s*(@|\[|\/\/|\/\*|\*|#|"""|''')/.test(lines[s - 1])) s--;
  return s;
}

export function findSymbol(root, name, file) {
  const last = name.split(/[.:#]+/).filter(Boolean).pop();
  if (!last) throw new UsageError("--symbol needs a name");
  let files;
  if (file) files = [file];
  else {
    const ls = sh("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], root);
    if (ls.status !== 0) throw new UsageError("--symbol without --file needs a git repository");
    files = ls.stdout.split("\0").filter((f) => SOURCE_EXT.test(f));
  }
  const found = [];
  for (const f of files) {
    let src;
    try { src = readSource(root, f); } catch (e) { if (file) throw e; continue; }
    if (!src.text.includes(last)) continue;
    const ext = path.extname(f).slice(1).toLowerCase();
    const res = definitionRegexes(last, ext);
    src.lines.forEach((l, i) => {
      if (res.some((r) => r.test(l)) && !NOT_DEF.test(l) && !/^\s*(\/\/|#|\*)/.test(l)) {
        const { end, approx } = blockEnd(src.lines, i, ext);
        found.push({ file: f, label: src.label, start: withLeadingDocs(src.lines, i) + 1, end: end + 1, approx });
      }
    });
    if (found.length > 12) break;
  }
  if (!found.length) throw new UsageError(`Symbol '${name}' not found${file ? ` in ${file}` : ""}. Pass --file and --lines instead.`);
  return found;
}

export function describeCandidates(found) {
  return found.map((f) => `  ${f.label}:${f.start}-${f.end}`).join("\n");
}
