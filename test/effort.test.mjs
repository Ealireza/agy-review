// --effort differs per model. These tests use agy's real validation messages (captured from agy 1.4.8) and a fake agy that repeats them.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { clampEffort, parseEffortError } from "../plugins/agy-review/scripts/lib/agy.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.join(here, "..", "plugins", "agy-review", "scripts", "agy-review.mjs");
const FAKE = path.join(here, "..", "fixtures", "fake-agy.mjs");
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "agyr-eff-"));
const CODE = "def avg(xs):\n    return sum(xs) / len(xs)\n";
const REPORT = { summary: "s", model_verdict: "approve", scope_reviewed: [{ file: "a.py", line_start: 1, line_end: 999 }], findings: [], questions: [], limitations: [] };

function run(args, { home, specs, dir } = {}) {
  const h = home ?? tmp(), cwd = dir ?? tmp();
  fs.writeFileSync(path.join(cwd, "a.py"), CODE);
  const resp = path.join(tmp(), "r.json"); fs.writeFileSync(resp, JSON.stringify(REPORT));
  const calls = path.join(tmp(), "calls.log");
  const env = { ...process.env, AGY_REVIEW_AGY_BIN: FAKE, HOME: h, USERPROFILE: h, FAKE_AGY_RESPONSE: resp, FAKE_AGY_CALLS: calls };
  if (specs) env.FAKE_AGY_EFFORTS = JSON.stringify(specs);
  const r = spawnSync(process.execPath, [CLI, ...args], { cwd, env, encoding: "utf8" });
  const log = fs.existsSync(calls) ? fs.readFileSync(calls, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
  return { ...r, home: h, calls: log, probes: log.filter((a) => a.includes("-p") && a.includes("--effort")), real: log.filter((a) => a.includes("--input-format")) };
}
const effortOf = (args) => args[args.indexOf("--effort") + 1];

test("parseEffortError understands the three messages agy really prints", () => {
  assert.deepEqual(parseEffortError('invalid model selection (--model "" --effort "xhigh"): gemini-3.8-flash has no "xhigh" effort (available: low, medium, high)'), { kind: "list", values: ["low", "medium", "high"] });
  assert.deepEqual(parseEffortError('invalid model selection (--model "gemini-3.8-flash-high" --effort "max"): --model gemini-3.8-flash-high conflicts with --effort=max'), { kind: "in-id" });
  assert.deepEqual(parseEffortError('invalid model selection (--model "claude-sonnet-4-6" --effort "max"): --effort is not supported for model "claude-sonnet-4-6"'), { kind: "none" });
  assert.equal(parseEffortError("auth failed"), null);
  assert.equal(parseEffortError('invalid --effort "zzz" (valid: low, medium, high, xhigh, max)'), null, "a generic error is not a capability answer");
});

test("clampEffort picks the nearest effort the model accepts and explains it", () => {
  const list = { kind: "list", values: ["low", "medium", "high"] };
  assert.deepEqual(clampEffort("xhigh", list, undefined), { effort: "high", note: "xhigh is not available for the default model (it offers low, medium, high), so high is used" });
  assert.equal(clampEffort("max", list).effort, "high");
  assert.equal(clampEffort("medium", list).effort, "medium");
  assert.equal(clampEffort("low", { kind: "list", values: ["medium", "high"] }).effort, "medium", "below the range: the lowest allowed");
  assert.equal(clampEffort("high", { kind: "none" }, "claude-sonnet-4-6").effort, undefined);
  const inId = clampEffort("xhigh", { kind: "in-id" }, "gemini-3.8-flash-high");
  assert.equal(inId.effort, undefined);
  assert.equal(inId.builtIn, "high");
  assert.equal(clampEffort("xhigh", { kind: "all" }).effort, "xhigh");
});

test("cli: xhigh on a model that offers low/medium/high becomes high, is reported, and the answer is cached (no second probe)", () => {
  const home = tmp(), specs = { default: ["low", "medium", "high"] };
  const a = run(["--file", "a.py", "--json", "--effort", "xhigh"], { home, specs });
  assert.equal(a.status, 0, a.stderr);
  const j = JSON.parse(a.stdout);
  assert.equal(j.effort.value, "high");
  assert.match(j.effort.reason, /xhigh is not available for the default model \(it offers low, medium, high\)/);
  assert.equal(a.probes.length, 1, "agy was asked once what the model accepts");
  assert.equal(effortOf(a.real[0]), "high", "the real run never saw xhigh");
  const b = run(["--file", "a.py", "--json", "--effort", "xhigh"], { home, specs });
  assert.equal(b.probes.length, 0, "the second run uses the cache");
  assert.equal(effortOf(b.real[0]), "high");
});

test("cli: auto effort never produces an invalid value (the reported bug)", () => {
  const big = tmp();
  fs.writeFileSync(path.join(big, "a.py"), "x = 1\n".repeat(400));
  const r = run(["--file", "a.py", "--security", "--json"], { dir: big, home: tmp(), specs: { default: ["low", "medium", "high"] } });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(JSON.parse(r.stdout).effort.value, "high", "400 lines + security would ask for xhigh, which this model does not have");
});

test("cli: effort built into the model name and models without --effort are run without it, and say so", () => {
  const specs = { default: ["low", "medium", "high"], "fake-fast": "in-id", "fake-deep": "none" };
  const inId = run(["--file", "a.py", "--json", "--model", "fake-fast", "--effort", "high"], { specs });
  assert.equal(inId.status, 0, inId.stderr);
  assert.ok(!inId.real[0].includes("--effort"));
  assert.match(JSON.parse(inId.stdout).effort.reason, /effort is part of the model name/);
  const none = run(["--file", "a.py", "--json", "--model", "fake-deep", "--effort", "high"], { specs });
  assert.ok(!none.real[0].includes("--effort"));
  assert.equal(JSON.parse(none.stdout).effort.value, "model default");
  const both = run(["--file", "a.py", "--json", "--models", "fake-fast,fake-deep", "--effort", "medium"], { specs });
  assert.equal(both.status, 0, both.stderr);
  assert.equal(JSON.parse(both.stdout).effort.value, "model default");
});

test("cli: an out-of-date cache is corrected from the error and the run is retried", () => {
  const home = tmp();
  fs.writeFileSync(path.join(home, ".agy-review-cache.json"), JSON.stringify({ "9.9.9-fake|default": { kind: "all" } }));
  const r = run(["--file", "a.py", "--json", "--effort", "xhigh"], { home, specs: { default: ["low", "medium", "high"] } });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(JSON.parse(r.stdout).effort.value, "high");
  assert.equal(r.real.length, 2, "first try rejected, second accepted");
  assert.equal(JSON.parse(fs.readFileSync(path.join(home, ".agy-review-cache.json"), "utf8"))["9.9.9-fake|default"].kind, "list", "and the cache now has the truth");
});

test("cli: --list-models shows what each model accepts; tasks report the effort really used", () => {
  const specs = { default: ["low", "medium", "high"], "fake-fast": "in-id", "fake-deep": "none" };
  const l = run(["--list-models"], { specs });
  assert.match(l.stdout, /fake-fast .*\[effort is in the name/);
  assert.match(l.stdout, /fake-deep .*\[no --effort\]/);
  assert.match(l.stdout, /\(no --model\) .*\[--effort low \| medium \| high\]/);
  const j = JSON.parse(run(["--list-models", "--format", "json"], { specs }).stdout);
  assert.equal(j.models.find((m) => m.id === "fake-deep").effort.kind, "none");
  const t = run(["--task", "Design a plan", "--format", "json", "--effort", "max"], { specs });
  assert.equal(t.status, 0, t.stderr);
  assert.equal(JSON.parse(t.stdout).effort.value, "high");
});

test("compareVersions orders dotted versions and ignores a leading v and a pre-release tag", async () => {
  const { compareVersions } = await import("../plugins/agy-review/scripts/lib/util.mjs");
  assert.equal(compareVersions("1.0.1", "1.0.0"), 1);
  assert.equal(compareVersions("v1.0.0", "1.0.0"), 0);
  assert.equal(compareVersions("1.9.0", "1.10.0"), -1);
  assert.equal(compareVersions("1.0", "1.0.0"), 0);
});

test("--version prints the plugin version", () => {
  const r = spawnSync(process.execPath, [CLI, "--version"], { encoding: "utf8" });
  assert.equal(r.status, 0);
  assert.match(r.stdout, /1\.0\.1/);
});
