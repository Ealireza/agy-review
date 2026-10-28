// Security review support that needs no model: bad-pattern signals, secret detection and redaction, related-code expansion.
// Rules map to CWE and OWASP Top 10 (2021). Signals are leads for the reviewer, not findings; only secrets are reported directly.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { findSymbol, readSource } from "./targets.mjs";
import { sh, sha } from "./util.mjs";

// definite: true  = a hard-coded credential. Reported as a finding and redacted before anything is sent to a model.
export const RULES = [
  { id: "secret.private-key", re: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP |ENCRYPTED )?PRIVATE KEY-----/, cwe: "CWE-798", owasp: "A07:2021", severity: "critical", name: "private key", definite: true },
  { id: "secret.aws-key", re: /\bAKIA[0-9A-Z]{16}\b/, cwe: "CWE-798", owasp: "A07:2021", severity: "critical", name: "AWS access key id", definite: true },
  { id: "secret.github-token", re: /\bgh[pousr]_[A-Za-z0-9]{36,}\b/, cwe: "CWE-798", owasp: "A07:2021", severity: "critical", name: "GitHub token", definite: true },
  { id: "secret.aws-temp-key", re: /\bASIA[0-9A-Z]{16}\b/, cwe: "CWE-798", owasp: "A07:2021", severity: "critical", name: "AWS temporary access key id", definite: true },
  { id: "secret.github-pat", re: /\bgithub_pat_[A-Za-z0-9_]{22,}\b/, cwe: "CWE-798", owasp: "A07:2021", severity: "critical", name: "GitHub fine-grained token", definite: true },
  { id: "secret.gitlab-token", re: /\bglpat-[A-Za-z0-9_-]{20,}\b/, cwe: "CWE-798", owasp: "A07:2021", severity: "critical", name: "GitLab token", definite: true },
  { id: "secret.stripe-live", re: /\bsk_live_[0-9a-zA-Z]{24,}\b/, cwe: "CWE-798", owasp: "A07:2021", severity: "critical", name: "Stripe live secret key", definite: true },
  { id: "secret.slack-token", re: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/, cwe: "CWE-798", owasp: "A07:2021", severity: "high", name: "Slack token", definite: true },
  { id: "secret.google-api-key", re: /\bAIza[0-9A-Za-z_-]{35}\b/, cwe: "CWE-798", owasp: "A07:2021", severity: "high", name: "Google API key", definite: true },
  { id: "secret.assignment", re: /\b(?:password|passwd|pwd|secret|api[_-]?key|access[_-]?token|auth[_-]?token)\b\s*[:=]\s*["'][^"'\s$<{][^"'\s]{7,}["']/i, cwe: "CWE-798", owasp: "A07:2021", message: "string literal assigned to a credential-like name (may be a placeholder)" },
  { id: "inject.eval", re: /\beval\s*\(|\bnew\s+Function\s*\(|\bexec\s*\(\s*[^)]/, cwe: "CWE-95", owasp: "A03:2021", message: "dynamic code evaluation" },
  { id: "inject.shell", re: /shell\s*=\s*True|\bos\.system\s*\(|\bos\.popen\s*\(|Runtime\.getRuntime\(\)\.exec|\bchild_process\b.*\bexec\s*\(|\bProcess\.Start\s*\(|\bsystem\s*\(\s*\$|\bshell_exec\s*\(|\bpassthru\s*\(/, cwe: "CWE-78", owasp: "A03:2021", message: "command execution; check whether any part is attacker-controlled" },
  { id: "inject.sql", re: /\b(?:select|insert|update|delete)\b[^;\n]*["']\s*(?:\+|%\s|\.format\()|f["'][^"'\n]*\b(?:select|insert|update|delete)\b[^"'\n]*\{|\b(?:execute|query|raw)\s*\(\s*[^)\n]*(?:\+\s*\w|\$\{)/i, cwe: "CWE-89", owasp: "A03:2021", message: "SQL built from strings; check for untrusted input" },
  { id: "xss.html", re: /\.innerHTML\s*=|\bouterHTML\s*=|dangerouslySetInnerHTML|\bdocument\.write\s*\(|\bv-html\b|\|\s*safe\b|\.html\s*\(\s*[^)'"]/, cwe: "CWE-79", owasp: "A03:2021", message: "raw HTML sink" },
  { id: "crypto.weak-hash", re: /\bhashlib\.(?:md5|sha1)\b|MessageDigest\.getInstance\(\s*["'](?:MD5|SHA-?1)["']|createHash\(\s*["'](?:md5|sha1)["']|\bMD5CryptoServiceProvider\b/i, cwe: "CWE-327", owasp: "A02:2021", message: "weak hash; fatal if used for passwords or signatures" },
  { id: "crypto.weak-cipher", re: /\b(?:DES|RC4|3DES)\b.*(?:Cipher|new|create)|Cipher\.getInstance\(\s*["'][^"']*(?:\/ECB\/|DES|RC4)|AES\/ECB/i, cwe: "CWE-327", owasp: "A02:2021", message: "weak cipher or ECB mode" },
  { id: "crypto.weak-random", re: /\b(?:token|secret|password|nonce|session|otp|salt|key)\w*\s*[:=][^\n]*\b(?:Math\.random|random\.random|random\.randint|\brand\s*\(|java\.util\.Random|new Random\s*\()/i, cwe: "CWE-338", owasp: "A02:2021", message: "non-cryptographic randomness for a security value" },
  { id: "tls.no-verify", re: /verify\s*=\s*False|rejectUnauthorized\s*:\s*false|InsecureSkipVerify\s*:\s*true|TrustAllCerts|ALLOW_ALL_HOSTNAME_VERIFIER|NODE_TLS_REJECT_UNAUTHORIZED\s*=\s*["']?0|ServerCertificateValidationCallback\s*[+=]/, cwe: "CWE-295", owasp: "A07:2021", message: "TLS certificate validation disabled" },
  { id: "deser.unsafe", re: /\bpickle\.loads?\s*\(|\bcPickle\b|\byaml\.load\s*\((?![^)]*SafeLoader)|\bObjectInputStream\b|\bunserialize\s*\(|\bBinaryFormatter\b|\bMarshal\.load\b|\bjsonpickle\.decode\b/, cwe: "CWE-502", owasp: "A08:2021", message: "unsafe deserialization of possibly untrusted data" },
  { id: "auth.jwt-none", re: /algorithms\s*=\s*\[[^\]]*["']none["']|verify_signature["']?\s*:\s*False|\balg["']?\s*[:=]\s*["']none["']/i, cwe: "CWE-347", owasp: "A02:2021", message: "JWT signature not enforced" },
  { id: "web.cors-any", re: /Access-Control-Allow-Origin["']?\s*[:,]\s*["']?\*|origin\s*:\s*["']\*["']|allow_origins\s*=\s*\[\s*["']\*["']|AllowAnyOrigin\(\)/i, cwe: "CWE-942", owasp: "A05:2021", message: "CORS allows any origin" },
  { id: "web.csrf-off", re: /csrf_exempt|csrf\s*\(\s*\)\s*\.disable|WTF_CSRF_ENABLED\s*=\s*False|ValidateAntiForgeryToken.*false/i, cwe: "CWE-352", owasp: "A01:2021", message: "CSRF protection disabled" },
  { id: "web.debug-on", re: /\bDEBUG\s*=\s*True\b|app\.run\([^)]*debug\s*=\s*True|UseDeveloperExceptionPage\(\)/, cwe: "CWE-489", owasp: "A05:2021", message: "debug mode enabled" },
  { id: "fs.world-writable", re: /\bchmod\s+(?:-R\s+)?0?777\b|0o777|MODE_WORLD_(?:READABLE|WRITEABLE)|Everyone.*FullControl/, cwe: "CWE-732", owasp: "A01:2021", message: "overly permissive file permissions" },
  { id: "xxe.parser", re: /DocumentBuilderFactory\.newInstance|SAXParserFactory\.newInstance|XMLInputFactory\.newInstance|resolve_entities\s*=\s*True|XmlResolver\s*=\s*(?!null)/, cwe: "CWE-611", owasp: "A05:2021", message: "XML parser; check that external entities are disabled" },
  { id: "android.exported", re: /android:exported\s*=\s*["']true["']|usesCleartextTraffic\s*=\s*["']true["']|android:allowBackup\s*=\s*["']true["']|android:debuggable\s*=\s*["']true["']/, cwe: "CWE-926", owasp: "A05:2021", message: "Android component or setting exposed" },
  { id: "android.webview", re: /setJavaScriptEnabled\s*\(\s*true\s*\)|addJavascriptInterface\s*\(|setAllowFileAccess(?:FromFileURLs)?\s*\(\s*true|setAllowUniversalAccessFromFileURLs\s*\(\s*true/, cwe: "CWE-749", owasp: "A05:2021", message: "risky WebView capability" },
  { id: "redirect.open", re: /\bredirect\s*\(\s*(?:request|req)\.|sendRedirect\s*\(\s*(?:request|req)\.|Location["']?\s*[:,]\s*(?:request|req)\./i, cwe: "CWE-601", owasp: "A01:2021", message: "redirect target taken from the request" },
  { id: "ssrf.fetch", re: /\b(?:requests\.(?:get|post)|urlopen|http\.get|fetch|axios\.(?:get|post)|HttpClient\.\w+Async|WebClient\.Download\w+)\s*\(\s*(?:request|req|params|args|input|user|url\b)/i, cwe: "CWE-918", owasp: "A10:2021", message: "outbound request to a caller-supplied URL" },
];

const mask = (s, re) => s.replace(new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g"), (m) => (m.length > 8 ? `${m.slice(0, 4)}…[redacted ${m.length} chars]` : "[redacted]"));

// Redacts every definite secret in a line. Used before code leaves the machine and before evidence is printed.
export function redactLine(line) {
  let out = line;
  for (const r of RULES) if (r.definite) out = mask(out, r.re);
  return out;
}

const PEM_BEGIN = /-----BEGIN [A-Z ]*PRIVATE KEY-----/;
const PEM_END = /-----END [A-Z ]*PRIVATE KEY-----/;

// Redacts a whole file's lines and keeps the line count. A private key is redacted from its BEGIN line through its END line,
// not only the header, because the base64 body is the secret.
export function redactLines(lines) {
  let inKey = false;
  return lines.map((line) => {
    if (inKey) { if (PEM_END.test(line)) inKey = false; return "[redacted private key material]"; }
    if (PEM_BEGIN.test(line)) { inKey = !PEM_END.test(line); return redactLine(line); }
    return redactLine(line);
  });
}

// Documentation keys such as AKIAIOSFODNN7EXAMPLE are public placeholders, not credentials.
const PLACEHOLDER = /EXAMPLE|PLACEHOLDER|XXXXXXXX|0{8,}|your[_-]?(?:key|token)/i;

// Scans the given regions of the given sources. Returns { signals, secrets }.
export function scan(regions, sources) {
  const signals = [], secrets = [];
  for (const r of regions) {
    const src = sources.get(r.label);
    if (!src) continue;
    for (let n = r.start; n <= Math.min(r.end, src.lines.length); n++) {
      const line = src.lines[n - 1];
      if (!line) continue;
      const long = line.length > 2000; // minified code: secrets are still hunted, heuristic signals are skipped
      for (const rule of RULES) {
        if (long && !rule.definite) continue;
        const m = rule.re.exec(line);
        if (!m || (rule.definite && PLACEHOLDER.test(m[0]))) continue;
        const item = { rule: rule.id, cwe: rule.cwe, owasp: rule.owasp, file: r.label, line: n, text: redactLine(line).trim().slice(0, 200), message: rule.message ?? `hard-coded ${rule.name}`, severity_hint: rule.severity ?? null };
        (rule.definite ? secrets : signals).push(item);
      }
    }
  }
  return { signals: dedupe(signals), secrets: dedupe(secrets) };
}
const dedupe = (a) => [...new Map(a.map((x) => [`${x.rule}|${x.file}|${x.line}`, x])).values()];

// A hard-coded secret is a finding by itself: no model is needed to decide, and none gets to see the value.
export function secretFindings(secrets, src) {
  return secrets.map((s) => ({
    id: sha(`${s.file}|${s.rule}|${s.line}`),
    title: `Hard-coded secret: ${s.message.replace(/^hard-coded /, "")}`,
    severity: s.severity_hint ?? "high", priority: "P0", category: "security", confidence: "high",
    file: s.file, line_start: s.line, line_end: s.line, evidence: s.text,
    explanation: "A credential is committed in source. Anyone with read access to the repository, its history, builds or logs can use it. Detected by pattern; the value was redacted and never sent to the model.",
    fix: "Revoke and rotate the credential now, remove it from the code and from git history, and load it from an environment variable or a secrets manager.",
    cwe: s.cwe, owasp: s.owasp, cve: "", exploitability: "demonstrated", attack_scenario: "", data_flow: "", scope: s.scope ?? "in", grounding: "pattern",
  }));
}

// ---------------------------------------------------------------- related code

const SKIP = new Set(["if", "for", "while", "switch", "catch", "return", "function", "def", "fun", "func", "new", "super", "this", "print", "println", "printf", "len", "range", "map", "filter", "sum", "min", "max", "str", "int", "float", "bool", "list", "dict", "set", "tuple", "type", "isinstance", "open", "console", "log", "require", "import", "assert", "sizeof", "await", "async", "then", "catch", "finally", "with", "sorted", "enumerate", "zip", "any", "all", "get", "put", "add", "remove", "push", "pop", "join", "split", "format", "toString", "equals", "hashCode", "forEach", "stream", "contains", "append", "extend", "keys", "values", "items"]);

function callNames(text) {
  const names = new Map();
  for (const m of text.matchAll(/\b([A-Za-z_][A-Za-z0-9_]{2,})\s*\(/g)) if (!SKIP.has(m[1])) names.set(m[1], (names.get(m[1]) ?? 0) + 1);
  return [...names.keys()];
}

function definedNames(text) {
  return [...text.matchAll(/\b(?:def|fun|func|function|fn)\s+([A-Za-z_]\w*)/g)].map((m) => m[1]);
}

// Adds read-only context for the code under review: what it calls (callees) and who calls it (callers).
// Returns extra regions (role: "context") and registers their sources. Bounded and best-effort.
export function expandRelated(root, regions, sources, { maxCallees = 6, maxCallers = 6, callerWindow = 8 } = {}) {
  const extra = [];
  const inScope = (label, line) => regions.some((r) => r.label === label && line >= r.start && line <= r.end);
  const text = regions.map((r) => sources.get(r.label).lines.slice(r.start - 1, r.end).join("\n")).join("\n");

  let tried = 0;
  for (const name of callNames(text)) {
    if (extra.filter((e) => e.kind === "callee").length >= maxCallees || tried++ > 24) break;
    let found;
    try { found = findSymbol(root, name); } catch { continue; }
    if (found.length !== 1 || inScope(found[0].label, found[0].start)) continue;
    const f = found[0];
    const src = readSource(root, f.file);
    sources.set(src.label, src);
    extra.push({ label: src.label, start: f.start, end: Math.min(f.end, f.start + 120), role: "context", kind: "callee", note: `defines ${name}()` });
  }

  const targets = [...new Set(definedNames(text))].slice(0, 4);
  for (const name of targets) {
    if (extra.filter((e) => e.kind === "caller").length >= maxCallers) break;
    const g = sh("git", ["grep", "-n", "-w", "-I", "--max-count=5", "-e", name], root);
    if (g.status !== 0) continue;
    for (const hit of g.stdout.split("\n").filter(Boolean).slice(0, 12)) {
      const m = /^(.*?):(\d+):/.exec(hit);
      if (!m || inScope(m[1], +m[2]) || extra.filter((e) => e.kind === "caller").length >= maxCallers) continue;
      let src;
      try { src = readSource(root, m[1]); } catch { continue; }
      sources.set(src.label, src);
      extra.push({ label: src.label, start: Math.max(1, +m[2] - callerWindow), end: Math.min(src.lines.length, +m[2] + callerWindow), role: "context", kind: "caller", note: `calls ${name}()` });
    }
  }
  return extra;
}

// ---------------------------------------------------------------- schema

// The security report is the review schema plus fields that make a security finding actionable and checkable.
export function securitySchemaPath(baseSchemaPath) {
  const base = JSON.parse(fs.readFileSync(baseSchemaPath, "utf8"));
  const item = base.properties.findings.items;
  Object.assign(item.properties, {
    owasp: { type: "string" },
    cve: { type: "string" },
    exploitability: { type: "string", enum: ["demonstrated", "likely", "conditional", "theoretical"] },
    attack_scenario: { type: "string" },
    data_flow: { type: "string" },
  });
  item.required.push("owasp", "cve", "exploitability", "attack_scenario", "data_flow");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "agy-security-")); // private directory: no predictable path, no symlink to follow
  const file = path.join(dir, "schema.json");
  fs.writeFileSync(file, JSON.stringify(base), { flag: "wx" });
  return file;
}
