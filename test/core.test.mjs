import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { effortForReview, effortForTask, resolveEffort } from "../plugins/agy-review/scripts/lib/effort.mjs";
import { computeVerdict, coverage, gateFails, ground, locateEvidence } from "../plugins/agy-review/scripts/lib/ground.mjs";
import { compareWithPrevious, mergeRuns } from "../plugins/agy-review/scripts/lib/merge.mjs";
import { findSymbol, parseRange } from "../plugins/agy-review/scripts/lib/targets.mjs";
import { lastJsonObject } from "../plugins/agy-review/scripts/lib/util.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.join(here, "..", "plugins", "agy-review", "scripts", "agy-review.mjs");
const FAKE = path.join(here, "..", "fixtures", "fake-agy.mjs");

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "agyr-test-"));
function run(args, { cwd, response, input, home } = {}) {
  const dir = cwd ?? tmp();
  const h = home ?? tmp();
  const env = { ...process.env, AGY_REVIEW_AGY_BIN: FAKE, HOME: h, USERPROFILE: h };
  if (response !== undefined) { const f = path.join(tmp(), "r.txt"); fs.writeFileSync(f, typeof response === "string" ? response : JSON.stringify(response)); env.FAKE_AGY_RESPONSE = f; }
  const log = path.join(tmp(), "log.json");
  env.FAKE_AGY_LOG = log;
  const r = spawnSync(process.execPath, [CLI, ...args], { cwd: dir, env, input, encoding: "utf8" });
  return { ...r, dir, home: h, sent: fs.existsSync(log) ? JSON.parse(fs.readFileSync(log, "utf8")) : null };
}
const CODE = "def avg(xs):\n    return sum(xs) / len(xs)\n\ndef first(xs):\n    return xs[0]\n";
const FULL = [{ file: "a.py", line_start: 1, line_end: 5 }];
const finding = (o) => ({ title: "t", severity: "high", priority: "P1", category: "correctness", confidence: "high", file: "a.py", line_start: 2, line_end: 2, evidence: "return sum(xs) / len(xs)", explanation: "empty list divides by zero", fix: "guard", cwe: "", ...o });
const report = (findings, extra = {}) => ({ summary: "s", model_verdict: "request_changes", scope_reviewed: FULL, findings, questions: [], limitations: [], ...extra });
const ctx = (extra = {}) => ({ sources: new Map([["a.py", { lines: CODE.split("\n") }]]), scopes: [], minConfidence: "medium", ...extra });
const verdictOf = (o) => computeVerdict({ findings: [], rejected: [], modelVerdicts: [], coverageRatio: 1, incomplete: false, ...o });

test("lastJsonObject takes the outermost schema object, even after prose with stray braces", () => {
  assert.deepEqual(lastJsonObject('```json\n{"a":1}\n```\n{"b":{"c":"}"}}'), { b: { c: "}" } });
  assert.deepEqual(lastJsonObject('use "{" to open {"a":1} then {"ok":{"x":2}}'), { ok: { x: 2 } });
  assert.equal(lastJsonObject("no json here"), null);
});

test("evidence: located, line-number prefixes and markers stripped, generic quotes refused", () => {
  const lines = CODE.split("\n");
  assert.equal(locateEvidence(lines, "return sum(xs) / len(xs)", 40).start, 2);
  assert.equal(locateEvidence(lines, "2|     return sum(xs) / len(xs)", 1).start, 2, "the N| prefix is ignored");
  assert.equal(locateEvidence(lines, "----- scope starts -----\n2| return sum(xs) / len(xs)", 1).start, 2);
  assert.equal(locateEvidence(lines, "return fabricated(xs)", 2), null);
  for (const generic of ["return null;", "}", "if (x) {", "return xs[0]"]) assert.equal(locateEvidence(lines, generic, 1), null, generic);
  assert.deepEqual(locateEvidence(lines, "def first(xs):\n    return xs[0]", 1), { start: 4, end: 5, hits: 1 });
});

test("evidence wrapped over several lines resolves to the smallest span, not the top of the file", () => {
  const lines = ["// header", "// more", "import x", "", "function f() {", "  const value = compute(first, ", "    other);", "}"];
  const loc = locateEvidence(lines, "const value = compute(first, other);", 1);
  assert.deepEqual([loc.start, loc.end, loc.hits], [6, 7, 1]);
});

test("ground: invented evidence rejected, wrong lines fixed, verdict ignores rejects", () => {
  const g = ground(report([finding({ line_start: 40 }), finding({ title: "ghost", evidence: "os.system(command)", severity: "critical", priority: "P0" })]), ctx());
  assert.equal(g.verified.length, 1);
  assert.equal(g.verified[0].line_start, 2);
  assert.equal(g.verified[0].grounding, "relocated");
  assert.equal(g.rejected.length, 1);
  assert.match(g.rejected[0].reason, /not found/);
  assert.equal(verdictOf({ findings: g.verified }), "request_changes");
  assert.equal(verdictOf({}), "approve");
  assert.equal(gateFails(g.verified, "high"), true);
  assert.equal(gateFails(g.verified, "critical"), false);
});

test("ground: a duplicate never lets a low-confidence finding through; the stronger one is kept", () => {
  const g = ground(report([
    finding({ severity: "nit", priority: "P3", confidence: "medium" }),
    finding({ severity: "critical", priority: "P0", confidence: "low" }),
  ]), ctx());
  assert.equal(g.verified.length, 1, "exactly one finding survives");
  assert.equal(g.speculative.length, 0);
  assert.equal(g.verified[0].confidence, "medium", "the better-supported finding is kept, not the later low-confidence one");
  assert.equal(g.verified[0].severity, "nit");
  assert.ok(g.rejected.some((r) => /duplicate/.test(r.reason)));
  // a different problem on the same line is not a duplicate: it stays, but low confidence never gates
  const other = ground(report([finding({ confidence: "medium" }), finding({ category: "security", severity: "critical", priority: "P0", confidence: "low" })]), ctx());
  assert.equal(other.verified.length, 1);
  assert.equal(other.speculative.length, 1);
});

test("ground: ambiguous quotes, context findings, priority bands and caps", () => {
  const dup = "def a():\n    value = compute(alpha, beta)\n\ndef b():\n    value = compute(alpha, beta)\n";
  const sources = new Map([["a.py", { lines: dup.split("\n") }]]);
  const amb = ground(report([finding({ evidence: "value = compute(alpha, beta)", line_start: 30 })]), { sources, scopes: [], minConfidence: "medium" });
  assert.equal(amb.rejected.length, 1);
  assert.match(amb.rejected[0].reason, /ambiguous/);
  const near = ground(report([finding({ evidence: "value = compute(alpha, beta)", line_start: 5 })]), { sources, scopes: [], minConfidence: "medium" });
  assert.equal(near.verified[0].line_start, 5);
  const g = ground(report([
    finding({ evidence: "def first(xs):", severity: "high", priority: "P3", category: "design" }),
    finding({ evidence: "return sum(xs) / len(xs)", severity: "critical", priority: "P2", category: "readability" }),
  ]), ctx({ scopes: [{ label: "a.py", start: 1, end: 3 }] }));
  const first = g.verified.find((f) => f.line_start === 4);
  assert.equal(first.priority, "P1", "high may only be P0 or P1");
  assert.equal(first.scope, "context");
  const read = g.verified.find((f) => f.line_start === 2);
  assert.equal(read.severity, "low", "readability is capped at low");
  assert.equal(gateFails([first], "high"), false, "context findings never gate");
});

test("verdict: nothing verified is not approval when findings were rejected, the model disagreed, or coverage is low", () => {
  assert.equal(verdictOf({ rejected: [{}] }), "inconclusive");
  assert.equal(verdictOf({ modelVerdicts: ["request_changes"] }), "inconclusive");
  assert.equal(verdictOf({ coverageRatio: 0.5 }), "inconclusive");
  assert.equal(verdictOf({ incomplete: true }), "inconclusive");
  assert.equal(coverage([{ label: "a.py", start: 1, end: 10 }], [{ file: "a.py", line_start: 1, line_end: 5 }]), 0.5);
  assert.equal(coverage([{ label: "a.py", start: 1, end: 10 }], []), 0);
});

test("merge: clusters by code location, flags severity disagreement, keeps priority order", () => {
  const a = { id: "1", file: "a.py", line_start: 2, line_end: 2, category: "correctness", evidence: "x", severity: "nit", priority: "P3", confidence: "medium", scope: "in" };
  const b = { ...a, severity: "high", priority: "P1" };
  const other = { ...a, id: "9", line_start: 90, line_end: 90, severity: "critical", priority: "P0" };
  const m = mergeRuns([{ model: "m1", verified: [a], speculative: [] }, { model: "m2", verified: [b, other], speculative: [] }]);
  assert.equal(m.length, 2);
  assert.equal(m[0].severity, "critical", "sorted most severe first");
  const merged = m.find((f) => f.line_start === 2);
  assert.equal(merged.severity, "high");
  assert.deepEqual(merged.agreement, { count: 2, total: 2, models: ["m1", "m2"] });
  assert.equal(merged.severity_disagreement, true);
});

test("compare: new, persisting, resolved and not_reported", () => {
  const prev = { findings: [{ id: "a", file: "f", evidence: "e1" }, { id: "b", file: "f", evidence: "e2" }, { id: "d", file: "f", evidence: "e4" }] };
  const cur = [{ id: "a", file: "f", evidence: "e1" }, { id: "c", file: "f", evidence: "e3" }];
  const r = compareWithPrevious(prev, cur, (p) => p.id === "d");
  assert.deepEqual([r.new, r.persisting, r.resolved, r.not_reported], [["c"], ["a"], ["b"], ["d"]]);
});

test("auto effort is explainable and never picks max", () => {
  assert.equal(effortForReview({ lines: 10 }).effort, "medium");
  assert.equal(effortForReview({ lines: 100 }).effort, "high");
  assert.equal(effortForReview({ lines: 100, focus: "security" }).effort, "xhigh");
  assert.equal(effortForReview({ lines: 5000, focus: "security" }).effort, "xhigh");
  assert.equal(effortForTask({ instruction: "Translate this to French", inputChars: 500 }).effort, "low");
  assert.equal(effortForTask({ instruction: "Design a caching strategy" }).effort, "high");
  assert.equal(resolveEffort("max", effortForTask({ instruction: "x" })).source, "user");
});

test("symbol finder: definitions yes, call sites no; Python, Kotlin, Go receivers, TS generics, expression bodies", () => {
  const root = tmp();
  fs.writeFileSync(path.join(root, "m.py"), "import os\n\n@cache\ndef load(path):\n    with open(path) as f:\n        return f.read()\n\ndef use():\n    load(1)\n    load(\n        2)\n");
  fs.writeFileSync(path.join(root, "A.kt"), 'class A {\n    /** doc */\n    fun run(n: Int): String {\n        val s = "}"\n        return if (n > 0) { "a" } else { "b" }\n    }\n    fun short() = 1\n    fun other() {\n        run(1)\n    }\n}\n');
  fs.writeFileSync(path.join(root, "s.go"), "package s\n\nfunc (s *Server) Handle(w int) error {\n\treturn nil\n}\n");
  fs.writeFileSync(path.join(root, "t.ts"), "class T {\n  load<T>(id: string): T {\n    return get<T>(id);\n  }\n  other() {\n    return load(\n      1);\n  }\n}\n");
  const py = findSymbol(root, "load", "m.py");
  assert.equal(py.length, 1);
  assert.deepEqual([py[0].start, py[0].end], [3, 6]);
  const kt = findSymbol(root, "A.run", "A.kt");
  assert.equal(kt.length, 1);
  assert.deepEqual([kt[0].start, kt[0].end], [2, 6]);
  const short = findSymbol(root, "short", "A.kt")[0];
  assert.ok(short.approx && short.end - short.start < 13, "expression body does not borrow the next function's braces");
  assert.equal(findSymbol(root, "Handle", "s.go")[0].start, 3);
  const ts = findSymbol(root, "load", "t.ts");
  assert.equal(ts.length, 1);
  assert.equal(ts[0].start, 2);
  assert.throws(() => findSymbol(root, "nope", "A.kt"), /not found/);
  assert.deepEqual(parseRange("40-80"), { start: 40, end: 80 });
  assert.deepEqual(parseRange("7"), { start: 7, end: 7 });
  assert.throws(() => parseRange("9-3"));
  assert.throws(() => parseRange("0-5"), /start at 1/);
});

test("cli: static review of a line range grounds findings and gates with exit 10", () => {
  const dir = tmp();
  fs.writeFileSync(path.join(dir, "a.py"), CODE);
  const r = run(["--file", "a.py:1-3", "--json", "--fail-on", "high"], { cwd: dir, response: report([finding({ line_start: 30 }), finding({ title: "ghost", evidence: "subprocess.call(x)" })]) });
  assert.equal(r.status, 10, r.stderr);
  const j = JSON.parse(r.stdout);
  assert.equal(j.mode, "static");
  assert.equal(j.verdict, "request_changes");
  assert.equal(j.counts.high, 1);
  assert.equal(j.findings[0].line_start, 2);
  assert.equal(j.rejected.length, 1);
  assert.match(r.sent.prompt, /STATIC REVIEW/);
  assert.match(r.sent.prompt, /2\| +return sum\(xs\) \/ len\(xs\)/);
  assert.ok(!r.sent.args.includes("--dangerously-skip-permissions"), "static mode never skips permissions");
  assert.ok(r.sent.args.includes("--json-schema"));
});

test("cli: everything rejected is inconclusive (exit 4), not an approval", () => {
  const dir = tmp();
  fs.writeFileSync(path.join(dir, "a.py"), CODE);
  const r = run(["--file", "a.py", "--json"], { cwd: dir, response: report([finding({ evidence: "totally_invented_call(xs)" })]) });
  assert.equal(r.status, 4, r.stderr);
  assert.equal(JSON.parse(r.stdout).verdict, "inconclusive");
});

test("cli: static mode cannot ground a finding in a file the model was not shown", () => {
  const dir = tmp();
  fs.writeFileSync(path.join(dir, "a.py"), CODE);
  fs.writeFileSync(path.join(dir, "b.py"), "def other(items):\n    return items.pop(0)\n");
  const r = run(["--file", "a.py", "--json"], { cwd: dir, response: report([finding({ file: "b.py", evidence: "return items.pop(0)" })]) });
  const j = JSON.parse(r.stdout);
  assert.equal(j.findings.length + j.context_findings.length, 0);
  assert.match(j.rejected[0].reason, /not available/);
});

test("cli: --symbol and --stdin work, markdown output, no gate by default", () => {
  const dir = tmp();
  fs.writeFileSync(path.join(dir, "a.py"), CODE);
  spawnSync("git", ["init", "-q"], { cwd: dir });
  const s = run(["--symbol", "first", "--file", "a.py"], { cwd: dir, response: report([finding({ evidence: "def first(xs):\n    return xs[0]", line_start: 4, explanation: "IndexError on an empty list" })], { scope_reviewed: [{ file: "a.py", line_start: 4, line_end: 5 }] }) });
  assert.equal(s.status, 0, s.stderr);
  assert.match(s.stdout, /Verdict: request changes/);
  assert.match(s.sent.prompt, /REVIEW SCOPE: lines 4-5/);
  const p = run(["--stdin", "--lang", "python", "--name", "snip.py", "--json", "--start-line", "10"], { cwd: dir, input: "def f(a):\n    return a.b.c\n", response: report([finding({ file: "snip.py", evidence: "def f(a):\n    return a.b.c", line_start: 10 })], { scope_reviewed: [{ file: "snip.py", line_start: 10, line_end: 11 }] }) });
  assert.equal(p.status, 0, p.stderr);
  const j = JSON.parse(p.stdout);
  assert.equal(j.findings[0].file, "snip.py");
  assert.equal(j.findings[0].line_start, 10);
  assert.ok(!/^ *\d+\| *$/m.test(p.sent.prompt.split("<code>")[1]), "no blank padding lines are sent for a snippet");
});

test("cli: --previous separates resolved from not-reported; a non-JSON reply is an error", () => {
  const dir = tmp();
  fs.writeFileSync(path.join(dir, "a.py"), CODE);
  const first = run(["--file", "a.py", "--json"], { cwd: dir, response: report([finding()]) });
  const prev = path.join(dir, "prev.json");
  fs.writeFileSync(prev, first.stdout);
  const same = JSON.parse(run(["--file", "a.py", "--json", "--previous", prev], { cwd: dir, response: report([]) }).stdout);
  assert.equal(same.comparison.not_reported.length, 1, "code unchanged: the reviewer just did not repeat it");
  fs.writeFileSync(path.join(dir, "a.py"), CODE.replace("sum(xs) / len(xs)", "sum(xs) / max(len(xs), 1)"));
  const fixed = JSON.parse(run(["--file", "a.py", "--json", "--previous", prev], { cwd: dir, response: report([]) }).stdout);
  assert.equal(fixed.comparison.resolved.length, 1);
  const bad = run(["--file", "a.py"], { cwd: dir, response: "I looked at it and it seems fine." });
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /not the required JSON/);
});

test("cli: models, persisted selection, precedence, validation", () => {
  const dir = tmp(), home = tmp();
  spawnSync("git", ["init", "-q"], { cwd: dir });
  assert.match(run(["--list-models"], { cwd: dir, home }).stdout, /fake-fast +Fake Fast \(Low\)/);
  const bad = run(["--set", "model=nope"], { cwd: dir, home });
  assert.equal(bad.status, 2);
  assert.match(bad.stderr, /Unknown model/);
  assert.match(run(["--set", "model=Fake Deep (High)"], { cwd: dir, home }).stdout, /Saved model = "fake-deep"/);
  fs.writeFileSync(path.join(dir, "a.py"), CODE);
  const r = run(["--file", "a.py", "--json"], { cwd: dir, home, response: report([]) });
  assert.equal(r.sent.args[r.sent.args.indexOf("--model") + 1], "fake-deep", "project setting is used");
  const over = run(["--file", "a.py", "--json", "--model", "fake-fast"], { cwd: dir, home, response: report([]) });
  assert.equal(over.sent.args[over.sent.args.indexOf("--model") + 1], "fake-fast", "CLI beats project setting");
  // user file lists several models, project file picks one: the project wins entirely
  fs.writeFileSync(path.join(home, ".agy-review.json"), JSON.stringify({ models: ["fake-fast", "fake-deep"] }));
  const prec = run(["--file", "a.py", "--json"], { cwd: dir, home, response: report([]) });
  assert.deepEqual(JSON.parse(prec.stdout).models, ["Fake Deep (High)"]);
  const multi = run(["--file", "a.py", "--json", "--models", "fake-fast,fake-deep"], { cwd: dir, home, response: report([finding()]) });
  assert.deepEqual(JSON.parse(multi.stdout).findings[0].agreement.models, ["Fake Fast (Low)", "Fake Deep (High)"]);
});

test("cli: invalid numbers and misplaced --lines are usage errors (exit 2), not silent misbehaviour", () => {
  const dir = tmp();
  fs.writeFileSync(path.join(dir, "a.py"), CODE);
  for (const args of [
    ["--file", "a.py", "--timeout", "abc"], ["--file", "a.py", "--effort", "foo"], ["--stdin", "--start-line", "x"], ["--file", "a.py", "--context-lines", "-5"],
    ["--file", "a.py", "--file", "a.py", "--lines", "1-2"], ["--symbol", "avg", "--file", "a.py", "--lines", "1-2"],
  ]) {
    const r = run(args, { cwd: dir, input: "x = 1\n", response: report([]) });
    assert.equal(r.status, 2, `${args.join(" ")} -> ${r.stderr}`);
  }
});

test("cli: task mode returns plain text, picks effort automatically and says why", () => {
  const dir = tmp();
  const r = run(["--task", "Translate to French", "--stdin"], { cwd: dir, input: "Hello world", response: "Bonjour le monde" });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout.trim(), "Bonjour le monde");
  assert.equal(r.sent.args[r.sent.args.indexOf("--effort") + 1], "low");
  assert.match(r.stderr, /effort low \(mechanical transform/);
  assert.ok(!r.sent.args.includes("--json-schema"));
  assert.match(r.sent.prompt, /<input name="stdin">\nHello world/);
  const j = run(["--task", "Design a plan", "--format", "json", "--effort", "max"], { cwd: dir, response: "ok" });
  assert.equal(JSON.parse(j.stdout).effort.source, "user");
});

test("cli: translate preset uses tone and glossary, and flags broken code, URLs and placeholders", () => {
  const dir = tmp();
  const src = "# Title\n\nRun `npm test` at https://example.com and show {{name}}.\n";
  fs.writeFileSync(path.join(dir, "in.md"), src);
  fs.writeFileSync(path.join(dir, "g.json"), '{"repo":"dÃ©pÃ´t"}');
  const ok = run(["--preset", "translate", "--to", "French", "--tone", "friendly", "--glossary", "g.json", "--input", "in.md", "--format", "json"], { cwd: dir, response: "# Titre\n\nLancez `npm test` sur https://example.com et affichez {{name}}.\n" });
  assert.equal(ok.status, 0, ok.stderr);
  assert.equal(JSON.parse(ok.stdout).checks.ok, true);
  assert.match(ok.sent.prompt, /Tone and register: friendly/);
  assert.match(ok.sent.prompt, /repo => dÃ©pÃ´t/);
  const broken = run(["--preset", "translate", "--to", "French", "--input", "in.md", "--strict"], { cwd: dir, response: "Titre\n\nLancez `npm tester` sur https://exemple.com et affichez {{nom}}.\n" });
  assert.equal(broken.status, 11);
  assert.match(broken.stderr, /check failed: URLs/);
  assert.equal(run(["--preset", "translate", "--input", "in.md"], { cwd: dir, response: "x" }).status, 2, "needs --to");
});

test("cli: security review redacts secrets before sending, reports them without the model, adds related code and signals", () => {
  const dir = tmp();
  spawnSync("git", ["init", "-q"], { cwd: dir });
  const secret = "AKIAQ7XK2M9PLTR4VWNB"; // not the public AWS example id, which the scanner deliberately ignores
  fs.writeFileSync(path.join(dir, "app.py"), `import subprocess\nfrom util import build_cmd\n\ndef run_backup(path):\n    key = "${secret}"\n    subprocess.call(build_cmd(path), shell=True)\n`);
  fs.writeFileSync(path.join(dir, "util.py"), "def build_cmd(path):\n    return 'tar czf /backup/out.tgz ' + path\n");
  fs.writeFileSync(path.join(dir, "main.py"), "from app import run_backup\n\ndef handler(request):\n    run_backup(request.args['p'])\n");
  spawnSync("git", ["add", "."], { cwd: dir });
  const sec = report([{ ...finding({ file: "app.py", evidence: "subprocess.call(build_cmd(path), shell=True)", line_start: 6, category: "security", cwe: "CWE-78", severity: "high", priority: "P0" }), owasp: "A03:2021 Injection", cve: "CVE-2099-12345", exploitability: "likely", attack_scenario: "attacker controls p", data_flow: "request.args['p'] -> run_backup -> shell" }], { scope_reviewed: [{ file: "app.py", line_start: 4, line_end: 6 }] });
  const r = run(["--security", "--symbol", "run_backup", "--file", "app.py", "--json"], { cwd: dir, response: sec });
  assert.equal(r.status, 0, r.stderr);
  assert.ok(!r.sent.prompt.includes(secret), "the secret never reaches the model");
  assert.match(r.sent.prompt, /SECURITY review/);
  assert.match(r.sent.prompt, /CALLER: main\.py/);
  assert.match(r.sent.prompt, /CALLEE: util\.py/);
  assert.match(r.sent.prompt, /inject\.shell/);
  const j = JSON.parse(r.stdout);
  assert.equal(j.review_type, "security");
  assert.ok(j.findings.some((f) => f.grounding === "pattern" && f.cwe === "CWE-798" && !JSON.stringify(f).includes(secret)), "secret reported by pattern, redacted");
  const model = j.findings.find((f) => f.cwe === "CWE-78");
  assert.equal(model.exploitability, "likely");
  assert.equal(model.cve_verified, false, "a CVE id from a model is never marked verified");
  assert.ok(j.related_code.length >= 2);
  assert.ok(r.sent.args.includes("--json-schema"));
});

test("cli: agentic review refuses to run without the guard", () => {
  const dir = tmp();
  spawnSync("git", ["init", "-q"], { cwd: dir });
  fs.writeFileSync(path.join(dir, "new.py"), "print('hi')\n"); // something to review, so the guard is actually consulted
  const r = run([], { cwd: dir, response: report([]) });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /read-only guard/);
});
