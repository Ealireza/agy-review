// Regression tests for problems found by independent reviews (Opus and Codex). One test per confirmed problem.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { decide } from "../plugins/agy-review/antigravity-plugin/readonly-review/guard.mjs";
import { ground } from "../plugins/agy-review/scripts/lib/ground.mjs";
import { parseDiff } from "../plugins/agy-review/scripts/lib/gitscope.mjs";
import { redactLines, scan } from "../plugins/agy-review/scripts/lib/security.mjs";
import { checkPreservation, splitChunks } from "../plugins/agy-review/scripts/lib/translate.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.join(here, "..", "plugins", "agy-review", "scripts", "agy-review.mjs");
const FAKE = path.join(here, "..", "fixtures", "fake-agy.mjs");
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "agyr-hard-"));
const git = (cwd, ...a) => spawnSync("git", ["-c", "user.email=t@t", "-c", "user.name=t", "-c", "commit.gpgsign=false", ...a], { cwd, encoding: "utf8" });

function run(args, { cwd, response, home, env = {}, steps, input } = {}) {
  const h = home ?? tmp();
  const e = { ...process.env, AGY_REVIEW_AGY_BIN: FAKE, HOME: h, USERPROFILE: h, ...env };
  const put = (v) => { const f = path.join(tmp(), "x.json"); fs.writeFileSync(f, typeof v === "string" ? v : JSON.stringify(v)); return f; };
  if (response !== undefined) e.FAKE_AGY_RESPONSE = put(response);
  if (steps) e.FAKE_AGY_STEPS = put(steps);
  const log = path.join(tmp(), "log.json");
  e.FAKE_AGY_LOG = log;
  const r = spawnSync(process.execPath, [CLI, ...args], { cwd: cwd ?? tmp(), env: e, input, encoding: "utf8" });
  return { ...r, home: h, sent: fs.existsSync(log) ? JSON.parse(fs.readFileSync(log, "utf8")) : null };
}
const finding = (o) => ({ title: "t", severity: "high", priority: "P1", category: "correctness", confidence: "high", file: "a.py", line_start: 2, line_end: 2, evidence: "return sum(xs) / len(xs)", explanation: "empty list divides by zero", fix: "guard", cwe: "", ...o });
const rep = (findings, extra = {}) => ({ summary: "s", model_verdict: "request_changes", scope_reviewed: [{ file: "a.py", line_start: 1, line_end: 5 }], findings, questions: [], limitations: [], ...extra });
const CODE = "def avg(xs):\n    return sum(xs) / len(xs)\n\ndef first(xs):\n    return xs[0]\n";
const VERIFY_STEPS = [
  { event: "step_update", step_update: { tool_name: "view_file", state: "DONE", tool_info: { parameters: { AbsolutePath: "/tmp/readme.txt" } } } },
  { event: "step_update", step_update: { tool_name: "write_to_file", state: "ERROR", tool_info: { parameters: { TargetFile: "/tmp/x" }, error: { message: "Read-only review mode: tool 'write_to_file' is not allowed." } } } },
];
function repo() {
  const dir = tmp();
  git(dir, "init", "-q");
  fs.writeFileSync(path.join(dir, "a.py"), CODE);
  fs.writeFileSync(path.join(dir, "notes.txt"), "keep\n");
  git(dir, "add", "-A"); git(dir, "commit", "-qm", "init");
  return dir;
}
// A repo with one uncommitted change on line 2 of a.py, a guard installed in a fresh HOME and a passing --verify.
function agenticSetup() {
  const dir = repo(), home = tmp();
  fs.writeFileSync(path.join(dir, "a.py"), CODE.replace("len(xs)", "len(xs)  # changed"));
  assert.equal(run(["--install-guard"], { cwd: dir, home }).status, 0);
  return { dir, home };
}

test("secrets: a private key is redacted through its END line, not only the header", () => {
  const out = redactLines(["x = 1", "-----BEGIN RSA PRIVATE KEY-----", "MIIEowIBAAKCAQEAu1SU1LfVLPHCozMxH2Mo4lgOEePzNm0tRgeLezV6ffAt0gun", "-----END RSA PRIVATE KEY-----", "y = 2"]).join("\n");
  assert.ok(!out.includes("MIIEow"));
  assert.ok(out.includes("x = 1") && out.includes("y = 2"));
  assert.equal(out.split("\n").length, 5, "line numbers stay aligned");
});

test("secrets: modern token formats found, placeholders ignored, minified lines still scanned", () => {
  const src = new Map([["f.js", { lines: ["const a = 'ASIAQ7XK2M9PLTR4VWNB';", "const b = 'github_pat_11ABCDEFG0abcdefghijkl_ZZZZ';", "const ok = 'AKIAIOSFODNN7EXAMPLE';", "x=1;" + "y".repeat(2500) + ";const k='AKIAQ7XK2M9PLTR4VWNB';"] }]]);
  const { secrets } = scan([{ label: "f.js", start: 1, end: 4 }], src);
  assert.deepEqual(secrets.map((s) => s.line).sort(), [1, 2, 4]);
  assert.ok(secrets.every((s) => !s.text.includes("Q7XK2M9PLTR4VWNB")), "evidence text is redacted");
});

test("guard: credential paths are refused in shell commands too; git remote show contacts the network", () => {
  const run = (c) => decide({ lastUserInput: "AGY_READONLY_REVIEW", toolCall: { name: "run_command", args: { CommandLine: c } } }).decision;
  for (const c of ["cat ~/.ssh/id_rsa", "ls ~/.ssh", "cat $HOME/.aws/credentials", 'type "C:\\Users\\me\\.ssh\\config"', "git remote show origin"]) assert.equal(run(c), "deny", c);
  for (const c of ["ls .aws-sam", "cat docs/sshd.md", "git remote -v", "git remote get-url origin"]) assert.equal(run(c), "allow", c);
});

test("ground: a later low-confidence finding never replaces an earlier high-confidence one; different categories on one line are both kept", () => {
  const sources = new Map([["a.py", { lines: CODE.split("\n") }]]);
  const ctx = { sources, scopes: [], minConfidence: "medium" };
  const same = ground(rep([finding({ confidence: "high", severity: "high" }), finding({ confidence: "low", severity: "critical", priority: "P0" })]), ctx);
  assert.equal(same.verified.length, 1);
  assert.equal(same.verified[0].confidence, "high");
  const diff = ground(rep([finding({ category: "security", title: "sec" }), finding({ category: "correctness", title: "bug" })]), ctx);
  assert.equal(diff.verified.length, 2);
  assert.notEqual(diff.verified[0].id, diff.verified[1].id);
});

test("ground: evidence of removed code must belong to the cited file; an empty git scope means nothing is in scope", () => {
  const sources = new Map([["a.js", { lines: ["const kept = 1;"] }], ["b.js", { lines: ["const other = 2;"] }]]);
  const diffByFile = new Map([["a.js", ["if (!isAdmin(user)) throw new Error('denied');"]]]);
  const ok = ground(rep([finding({ file: "a.js", evidence: "if (!isAdmin(user)) throw new Error('denied');" })]), { sources, scopes: [{ label: "a.js", start: 1, end: 1 }], restricted: true, diffByFile, minConfidence: "medium" });
  assert.equal(ok.verified[0].grounding, "diff");
  const wrong = ground(rep([finding({ file: "b.js", evidence: "if (!isAdmin(user)) throw new Error('denied');" })]), { sources, scopes: [{ label: "a.js", start: 1, end: 1 }], restricted: true, diffByFile, minConfidence: "medium" });
  assert.equal(wrong.rejected.length, 1);
  const empty = ground(rep([finding({ file: "b.js", evidence: "const other = 2;", line_start: 1 })]), { sources, scopes: [], restricted: true, minConfidence: "medium" });
  assert.equal(empty.verified[0].scope, "context");
});

test("ground: a recognised secret in a model reply is redacted before it reaches the report", () => {
  const sources = new Map([["a.py", { lines: ["key = 'AKIAQ7XK2M9PLTR4VWNB'  # token", "x = 1"] }]]);
  const g = ground(rep([finding({ evidence: "key = 'AKIAQ7XK2M9PLTR4VWNB'  # token", line_start: 1, explanation: "uses AKIAQ7XK2M9PLTR4VWNB directly" })]), { sources, scopes: [], minConfidence: "medium" });
  assert.ok(!JSON.stringify(g).includes("Q7XK2M9PLTR4VWNB"));
});

test("git diff parsing keeps removed lines per file and lists deleted files", () => {
  const d = parseDiff("--- a/a.js\n+++ b/a.js\n@@ -1,2 +1,1 @@\n-const gone = 1;\n+const here = 1;\n--- a/old.js\n+++ /dev/null\n@@ -1 +0,0 @@\n-removed();\n");
  assert.deepEqual(d.regions, [{ label: "a.js", start: 1, end: 1 }]);
  assert.deepEqual(d.deleted, ["old.js"]);
  assert.deepEqual(d.byFile.get("a.js"), ["const gone = 1;", "const here = 1;"]);
  assert.deepEqual(d.byFile.get("old.js"), ["removed();"]);
});

test("translate: changed code inside an unchanged fence is caught; oversized paragraphs are split", () => {
  const src = "Run it:\n\n```js\nconst x = 1;\n```\n";
  const r = checkPreservation(src, "Lancez:\n\n```js\nrmEverything();\n```\n");
  assert.ok(r.issues.some((i) => i.check === "fenced code content"));
  assert.equal(checkPreservation(src, "Lancez:\n\n```js\nconst x = 1;\n```\n").ok, true);
  const big = "word ".repeat(2000) + "end.";
  for (const c of splitChunks(big, 1000)) assert.ok(c.length <= 1100, `chunk of ${c.length}`);
  const withCode = splitChunks("a\n\n```\n" + "x\n".repeat(900) + "```\n\nb", 500);
  assert.ok(withCode.some((c) => c.includes("```") && (c.match(/```/g) ?? []).length === 2), "a code block is never cut");
});

test("cli: conflicting targets and misplaced flags are usage errors", () => {
  const dir = repo();
  for (const args of [["--base", "main", "--file", "a.py"], ["--base", "main", "--staged"], ["--stdin", "--agentic"], ["--agentic"], ["--file", "a.py", "--paths", "x"]]) {
    const r = run(args, { cwd: dir, input: "x = 1\n", response: rep([]) });
    assert.equal(r.status, 2, `${args.join(" ")} -> ${r.stderr}`);
  }
});

test("cli: an invalid value in a settings file is refused, and startLine is not a setting", () => {
  const dir = repo(), home = tmp();
  fs.writeFileSync(path.join(home, ".agy-review.json"), JSON.stringify({ timeout: "bad" }));
  const r = run(["--file", "a.py"], { cwd: dir, home, response: rep([]) });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /timeout/);
  fs.rmSync(path.join(home, ".agy-review.json"));
  assert.equal(run(["--set", "startLine=5"], { cwd: dir, home }).status, 2);
});

test("cli: a clean working tree is 'nothing to review', not a review of the whole repository", () => {
  const dir = repo(), home = tmp();
  run(["--install-guard"], { cwd: dir, home });
  const r = run(["--json"], { cwd: dir, home, response: rep([]) });
  assert.equal(r.status, 0, r.stderr);
  assert.match(JSON.parse(r.stdout).note, /No changes to review/);
  assert.equal(r.sent, null, "no model was called");
});

test("cli: agentic reviews need a PASSING --verify for this guard; then they run and are scoped to the changed lines", () => {
  const { dir, home } = agenticSetup();
  const refused = run([], { cwd: dir, home, response: rep([]) });
  assert.equal(refused.status, 2);
  assert.match(refused.stderr, /never verified/);
  const failed = run(["--verify"], { cwd: dir, home, steps: [] });
  assert.equal(failed.status, 1, "no read and no guard event: verification must fail");
  assert.equal(run([], { cwd: dir, home, response: rep([]) }).status, 2, "a failed verify does not unlock agentic reviews");
  const ok = run(["--verify"], { cwd: dir, home, steps: VERIFY_STEPS });
  assert.equal(ok.status, 0, ok.stdout + ok.stderr);
  const pre = finding({ file: "a.py", evidence: "return xs[0]", line_start: 5 });
  const r = run(["--json"], { cwd: dir, home, response: rep([finding({ evidence: "return sum(xs) / len(xs)", line_start: 2 }), { ...pre, evidence: "def first(xs):\n    return xs[0]", line_start: 4, title: "pre-existing" }]) });
  assert.equal(r.status, 0, r.stderr);
  assert.ok(r.sent.args.includes("--dangerously-skip-permissions"));
  assert.match(r.sent.prompt, /^AGY_READONLY_REVIEW/);
  const j = JSON.parse(r.stdout);
  assert.deepEqual(j.target.files, [{ file: "a.py", line_start: 2, line_end: 2 }]);
  assert.equal(j.findings.length, 1, "only the changed line counts");
  assert.equal(j.context_findings.length, 1, "the untouched function is context");
  // an agy update invalidates the verification
  const marker = path.join(home, ".gemini", "config", "plugins", "readonly-review", ".verified.json");
  const m = JSON.parse(fs.readFileSync(marker, "utf8"));
  fs.writeFileSync(marker, JSON.stringify({ ...m, agy_version: "0.0.1" }));
  assert.match(run([], { cwd: dir, home, response: rep([]) }).stderr, /changed since the last check/);
});

test("cli: a change to the working tree during an agentic review is exit 3, including an already-untracked file", () => {
  const { dir, home } = agenticSetup();
  assert.equal(run(["--verify"], { cwd: dir, home, steps: VERIFY_STEPS }).status, 0);
  fs.writeFileSync(path.join(dir, "scratch.txt"), "before\n"); // untracked before the run
  const touched = run([], { cwd: dir, home, response: rep([]), env: { FAKE_AGY_WRITE: path.join(dir, "scratch.txt") } });
  assert.equal(touched.status, 3, touched.stderr);
  assert.match(touched.stderr, /working tree changed/);
});

test("cli: a failed model makes the run incomplete (exit 4); a gate failure still wins (exit 10); secrets survive total failure", () => {
  const dir = tmp();
  fs.writeFileSync(path.join(dir, "a.py"), CODE);
  const base = ["--file", "a.py", "--models", "fake-fast,fake-deep", "--json"];
  const inc = run(base, { cwd: dir, response: rep([]), env: { FAKE_AGY_FAIL_MODEL: "fake-deep" } });
  assert.equal(inc.status, 4, inc.stderr);
  assert.equal(JSON.parse(inc.stdout).incomplete, true);
  const gate = run([...base, "--fail-on", "high"], { cwd: dir, response: rep([finding()]), env: { FAKE_AGY_FAIL_MODEL: "fake-deep" } });
  assert.equal(gate.status, 10);
  fs.writeFileSync(path.join(dir, "k.py"), "TOKEN = 'ghp_" + "a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6q7R8" + "'\n");
  const all = run(["--file", "k.py", "--model", "fake-fast", "--json"], { cwd: dir, response: rep([]), env: { FAKE_AGY_FAIL_MODEL: "fake-fast" } });
  assert.equal(all.status, 4, all.stderr);
  const j = JSON.parse(all.stdout);
  assert.ok(j.findings.some((f) => f.grounding === "pattern"), "the scanner result is reported although no model answered");
  assert.ok(!all.stdout.includes("a1B2c3D4e5F6"), "and it is redacted");
});
