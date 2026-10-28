// Keeping a graphify graph fresh on Antigravity. graphify and agy are both replaced by fakes; the real pair was exercised by hand.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { AGENT_RULE, ruleFiles, writeRules } from "../plugins/agy-review/scripts/lib/graphify.mjs";
import { buildPrompt, cleanReply, startShim } from "../plugins/agy-review/scripts/lib/shim.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.join(here, "..", "plugins", "agy-review", "scripts", "agy-review.mjs");
const FAKE_AGY = path.join(here, "..", "fixtures", "fake-agy.mjs");
const FAKE_GFY = path.join(here, "..", "fixtures", "fake-graphify.mjs");
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "agyr-gfy-"));
const git = (cwd, ...a) => spawnSync("git", ["-c", "user.email=t@t", "-c", "user.name=t", "-c", "commit.gpgsign=false", ...a], { cwd, encoding: "utf8" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function sandbox({ graph = true } = {}) {
  const dir = tmp(), home = tmp(), logs = tmp();
  git(dir, "init", "-q");
  fs.writeFileSync(path.join(dir, "a.py"), "x = 1\n");
  if (graph) { fs.mkdirSync(path.join(dir, "graphify-out")); fs.writeFileSync(path.join(dir, "graphify-out", "graph.json"), "{}"); }
  git(dir, "add", "-A"); git(dir, "commit", "-qm", "init");
  const reply = path.join(logs, "reply.txt"); fs.writeFileSync(reply, '```json\n{"nodes":[{"id":"a"}],"edges":[]}\n```');
  const env = {
    ...process.env, HOME: home, USERPROFILE: home, AGY_REVIEW_HOME: path.join(home, ".agy-review"), AGY_REVIEW_AGY_BIN: FAKE_AGY, FAKE_AGY_RESPONSE: reply,
    FAKE_AGY_LOG: path.join(logs, "agy.json"), AGY_GRAPHIFY_CMD: JSON.stringify([process.execPath, FAKE_GFY]), AGY_GRAPHIFY_HAS_OPENAI: "1",
    FAKE_GFY_LOG: path.join(logs, "gfy.log"), FAKE_GFY_REPLY: path.join(logs, "gfy-reply.txt"),
  };
  const cli = (args, extra = {}) => spawnSync(process.execPath, [CLI, ...args], { cwd: dir, env: { ...env, ...extra }, encoding: "utf8", timeout: 60_000 });
  const calls = () => (fs.existsSync(env.FAKE_GFY_LOG) ? fs.readFileSync(env.FAKE_GFY_LOG, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l)) : []);
  return { dir, home, logs, env, cli, calls, status: () => { try { return JSON.parse(fs.readFileSync(path.join(dir, "graphify-out", ".agy-update.json"), "utf8")); } catch { return null; } } };
}

// ---------------------------------------------------------------- the local server

async function post(base, token, body, { host } = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(base + "/chat/completions");
    const req = http.request({ host: u.hostname, port: u.port, path: u.pathname, method: "POST", headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}), ...(host ? { host } : {}) } }, (res) => {
      let d = ""; res.on("data", (c) => (d += c)); res.on("end", () => resolve({ status: res.statusCode, body: d ? JSON.parse(d) : null }));
    });
    req.on("error", reject);
    req.end(JSON.stringify(body));
  });
}

test("shim: answers with agy, hands back clean JSON, notes dropped images, honours per-call model", async () => {
  const s = sandbox();
  Object.assign(process.env, { AGY_REVIEW_AGY_BIN: FAKE_AGY, FAKE_AGY_RESPONSE: s.env.FAKE_AGY_RESPONSE, FAKE_AGY_LOG: s.env.FAKE_AGY_LOG });
  const shim = await startShim({ effort: "low", concurrency: 2 });
  try {
    const messages = [{ role: "system", content: "Extract JSON." }, { role: "user", content: [{ type: "text", text: "Doc text" }, { type: "image_url", image_url: { url: "data:image/png;base64,AAAA" } }] }];
    const ok = await post(shim.url, shim.token, { model: "agy:fake-deep", messages });
    assert.equal(ok.status, 200);
    assert.equal(ok.body.choices[0].message.content, '{"nodes":[{"id":"a"}],"edges":[]}', "fences and prose are stripped");
    assert.equal(ok.body.usage.prompt_tokens, 10);
    const sent = JSON.parse(fs.readFileSync(s.env.FAKE_AGY_LOG, "utf8"));
    assert.equal(sent.args[sent.args.indexOf("--model") + 1], "fake-deep");
    assert.ok(!sent.args.includes("--dangerously-skip-permissions"), "the model never gets tool permissions");
    assert.match(sent.prompt, /an image was attached here and is not available to you/);
    assert.ok(!sent.prompt.includes("AAAA"), "pixels are not forwarded");
    assert.equal(shim.stats.calls, 1);
  } finally { await shim.stop(); }
});

test("shim: rejects missing or wrong keys, foreign Host headers, other paths and bad bodies", async () => {
  Object.assign(process.env, { AGY_REVIEW_AGY_BIN: FAKE_AGY });
  const shim = await startShim({});
  try {
    const m = [{ role: "user", content: "x" }];
    assert.equal((await post(shim.url, null, { messages: m })).status, 401);
    assert.equal((await post(shim.url, "wrong-token", { messages: m })).status, 401);
    assert.equal((await post(shim.url, shim.token, { messages: m }, { host: "evil.example:80" })).status, 403, "DNS-rebinding guard");
    assert.equal((await post(shim.url, shim.token, { nope: 1 })).status, 400);
    const res = await fetch(shim.baseUrl + "/v1/models", { headers: { authorization: `Bearer ${shim.token}` } });
    assert.equal(res.status, 200);
    assert.equal((await fetch(shim.baseUrl + "/v1/models")).status, 401);
    assert.equal((await fetch(shim.baseUrl + "/admin", { headers: { authorization: `Bearer ${shim.token}` } })).status, 404);
  } finally { await shim.stop(); }
});

test("shim: an empty agy answer becomes a 502 with the reason, so the caller retries the chunk", async () => {
  const s = sandbox();
  fs.writeFileSync(s.env.FAKE_AGY_RESPONSE, "");
  Object.assign(process.env, { AGY_REVIEW_AGY_BIN: FAKE_AGY, FAKE_AGY_RESPONSE: s.env.FAKE_AGY_RESPONSE });
  const shim = await startShim({});
  try {
    const r = await post(shim.url, shim.token, { messages: [{ role: "user", content: "x" }] });
    assert.equal(r.status, 502);
    assert.match(r.body.error.message, /agy returned no answer/);
    assert.equal(shim.stats.failed, 1);
  } finally { await shim.stop(); }
});

test("shim: credentials in the documents are redacted before anything is sent to the model", () => {
  const p = buildPrompt([{ role: "user", content: "Deploy notes\nkey AKIAQ7XK2M9PLTR4VWNB\n-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEAu1SU1LfVLPHCozMxH2Mo4lgOEePzNm0t\n-----END RSA PRIVATE KEY-----\nplain sentence stays" }]);
  assert.ok(!p.includes("Q7XK2M9PLTR4VWNB"));
  assert.ok(!p.includes("MIIEowIBAAKCAQEA"));
  assert.match(p, /plain sentence stays/);
});

test("cleanReply and buildPrompt", () => {
  assert.equal(cleanReply('Here you go:\n```json\n{"a":1}\n```\nDone'), '{"a":1}');
  assert.equal(cleanReply("plain text answer"), "plain text answer");
  assert.equal(cleanReply('[1,2,3]'), "[1,2,3]");
  assert.match(buildPrompt([{ role: "system", content: "S" }, { role: "user", content: "U" }]), /<system>\nS\n<\/system>[\s\S]*<task>\n\[user\]\nU\n<\/task>/);
});

// ---------------------------------------------------------------- the update

test("update: graphify is pinned to the local agy server for every LLM step, and the request really reaches agy", () => {
  const s = sandbox();
  const r = s.cli(["--graphify", "update", "--quiet"]);
  assert.equal(r.status, 0, r.stderr + r.stdout);
  const [ex, cl] = s.calls();
  assert.equal(ex.args[0], "extract");
  assert.equal(ex.backend, "ollama", "GRAPHIFY_BACKEND is pinned");
  assert.ok(ex.args.includes("--backend") && ex.args[ex.args.indexOf("--backend") + 1] === "ollama");
  assert.match(ex.base, /^http:\/\/127\.0\.0\.1:\d+\/v1$/, "the endpoint is the local shim");
  assert.equal(ex.hasKey, true);
  assert.equal(ex.skipHook, "1", "no recursion into graphify's own hooks");
  assert.equal(cl.args[0], "cluster-only");
  assert.ok(cl.args.includes("--backend=ollama"), "community naming is pinned too");
  assert.equal(fs.readFileSync(s.env.FAKE_GFY_REPLY, "utf8"), '{"nodes":[{"id":"a"}],"edges":[]}');
  const sent = JSON.parse(fs.readFileSync(s.env.FAKE_AGY_LOG, "utf8"));
  assert.match(sent.prompt, /Discounts never go below zero/, "graphify's prompt was handed to agy");
  assert.ok(!sent.args.includes("--dangerously-skip-permissions"));
  const st = s.status();
  assert.equal(st.ok, true);
  assert.equal(st.agy_calls, 1);
  assert.match(st.summary, /1 re-extracted/);
});

test("update: nothing changed means no community naming; no graph means skipped unless --full; a failure is recorded", () => {
  const s = sandbox();
  s.cli(["--graphify", "update", "--quiet"], { FAKE_GFY_SUMMARY: "[graphify extract] incremental summary: 4 files cached/unchanged, 0 re-extracted, 0 deleted" });
  assert.deepEqual(s.calls().map((c) => c.args[0]), ["extract"], "cluster-only is not run when nothing changed");
  const none = sandbox({ graph: false });
  const skipped = none.cli(["--graphify", "update"]);
  assert.equal(skipped.status, 0);
  assert.match(skipped.stdout, /skipped: no graph yet/);
  assert.equal(none.calls().length, 0);
  const full = none.cli(["--graphify", "update", "--full", "--quiet"]);
  assert.equal(full.status, 0, full.stderr);
  assert.ok(none.calls()[0].args.includes("--force"));
  const bad = sandbox();
  const r = bad.cli(["--graphify", "update", "--quiet"], { FAKE_GFY_FAIL: "1" });
  assert.equal(r.status, 1);
  assert.equal(bad.status().ok, false);
});

test("update: a running update is not doubled; it asks for one more round instead", () => {
  const s = sandbox();
  fs.writeFileSync(path.join(s.dir, "graphify-out", ".agy-update.lock"), JSON.stringify({ pid: process.pid, at: Date.now() }));
  const r = s.cli(["--graphify", "update"]);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /another update is running/);
  assert.ok(fs.existsSync(path.join(s.dir, "graphify-out", ".agy-update.again")));
  assert.equal(s.calls().length, 0);
});

test("update: --detach returns at once and the work finishes in the background", async () => {
  const s = sandbox();
  const t0 = Date.now();
  const r = s.cli(["--graphify", "update", "--detach", "--quiet"]);
  assert.equal(r.status, 0, r.stderr);
  assert.ok(Date.now() - t0 < 5000, "the caller does not wait for the model");
  for (let i = 0; i < 100 && !s.status(); i++) await sleep(200);
  assert.equal(s.status()?.ok, true, "the detached child finished the update");
});

// ---------------------------------------------------------------- hooks

test("hooks: installed idempotently, existing hook content is kept, graphify's own are replaced, uninstall is clean", () => {
  const s = sandbox();
  const hook = path.join(s.dir, ".git", "hooks", "post-commit");
  fs.mkdirSync(path.dirname(hook), { recursive: true });
  fs.writeFileSync(hook, "#!/bin/sh\necho my-own-hook\n", { mode: 0o755 });
  const a = s.cli(["--graphify", "hook-install"]);
  assert.equal(a.status, 0, a.stderr);
  s.cli(["--graphify", "hook-install"]);
  const text = fs.readFileSync(hook, "utf8");
  assert.match(text, /echo my-own-hook/);
  assert.equal((text.match(/agy-graphify-hook-start/g) ?? []).length, 1, "installing twice does not duplicate the block");
  assert.match(text, /--graphify update --detach --quiet/);
  assert.match(fs.readFileSync(path.join(s.dir, ".git", "hooks", "post-checkout"), "utf8"), /"\$3" = "1"/, "only branch checkouts, not file checkouts");
  assert.ok(s.calls().some((c) => c.args[0] === "hook" && c.args[1] === "uninstall"), "graphify's own hooks were removed first");
  assert.ok(fs.existsSync(path.join(s.home, ".agy-review", "runtime", "scripts", "agy-review.mjs")), "a self-contained runtime copy exists");
  assert.match(fs.readFileSync(path.join(s.dir, ".git", "info", "exclude"), "utf8"), /graphify-out\/\.agy-update\.\*/, "our status files stay out of git status");
  const keep = sandbox();
  keep.cli(["--graphify", "hook-install", "--keep-graphify-hook"]);
  assert.ok(!keep.calls().some((c) => c.args[0] === "hook"), "--keep-graphify-hook leaves graphify's hooks alone");
  const u = s.cli(["--graphify", "hook-uninstall", "--restore-graphify"]);
  assert.equal(u.status, 0, u.stderr);
  assert.match(fs.readFileSync(hook, "utf8"), /echo my-own-hook/);
  assert.ok(!fs.readFileSync(hook, "utf8").includes("agy-graphify-hook"));
  assert.ok(!fs.existsSync(path.join(s.dir, ".git", "hooks", "post-merge")), "a hook file that only held our block is removed");
  assert.ok(s.calls().some((c) => c.args[0] === "hook" && c.args[1] === "install"), "graphify's hooks were restored");
});

test("hooks: a real commit triggers the background update (git runs the hook)", async () => {
  const s = sandbox();
  assert.equal(s.cli(["--graphify", "setup"]).status, 0);
  fs.writeFileSync(path.join(s.dir, "docs.md"), "New doc\n");
  git(s.dir, "add", "-A");
  const t0 = Date.now();
  const c = spawnSync("git", ["-c", "user.email=t@t", "-c", "user.name=t", "-c", "commit.gpgsign=false", "commit", "-qm", "doc"], { cwd: s.dir, env: s.env, encoding: "utf8" });
  assert.equal(c.status, 0, c.stderr);
  assert.ok(Date.now() - t0 < 8000, "the commit does not wait for the update");
  for (let i = 0; i < 150 && !s.status(); i++) await sleep(200);
  const why = () => {
    const out = path.join(s.dir, "graphify-out"), read = (f) => { try { return fs.readFileSync(f, "utf8"); } catch (e) { return `(${e.code})`; } };
    const manual = spawnSync("sh", [path.join(s.dir, ".git", "hooks", "post-commit")], { cwd: s.dir, env: s.env, encoding: "utf8" });
    return `files: ${fs.readdirSync(out).join(",")}\nlog: ${read(path.join(out, ".agy-update.log"))}\nhook run by hand: ${manual.status} ${manual.stdout}${manual.stderr}\nhook:\n${read(path.join(s.dir, ".git", "hooks", "post-commit"))}`;
  };
  assert.equal(s.status()?.ok, true, `the hook started an update that finished\n${s.status() ? "" : why()}`);
  assert.equal(s.calls().find((c) => c.args[0] === "extract").backend, "ollama");
});

test("setup: refuses when graphify's Python lacks the openai package, and says how to add it", () => {
  const s = sandbox();
  const r = s.cli(["--graphify", "setup"], { AGY_GRAPHIFY_HAS_OPENAI: "", AGY_GRAPHIFY_PYTHON: process.execPath });
  assert.equal(r.status, 2);
  assert.match(r.stdout, /uv tool install --force "graphifyy\[openai\]"/);
  assert.ok(!fs.existsSync(path.join(s.dir, ".git", "hooks", "post-commit")) || !fs.readFileSync(path.join(s.dir, ".git", "hooks", "post-commit"), "utf8").includes("agy-graphify"), "no hooks are installed in a broken setup");
});

// ---------------------------------------------------------------- agent rules

test("rules: appended once, never created from nothing, and a graphify section is detected", () => {
  const dir = tmp();
  assert.deepEqual(writeRules(dir), [], "no CLAUDE.md or AGENTS.md: nothing is created");
  fs.writeFileSync(path.join(dir, "CLAUDE.md"), "# Project\n\n## graphify\nRebuild the graph after code changes.\n");
  assert.equal(ruleFiles(dir).find((f) => f.file === "CLAUDE.md").hasGraphifySection, true);
  writeRules(dir); writeRules(dir);
  const t = fs.readFileSync(path.join(dir, "CLAUDE.md"), "utf8");
  assert.equal((t.match(/agy-graphify-rule-start/g) ?? []).length, 1);
  assert.match(t, /Rebuild the graph after code changes/, "the user's own text is untouched");
  assert.ok(t.includes(AGENT_RULE.trim().split("\n")[1]));
  assert.equal(ruleFiles(dir).find((f) => f.file === "CLAUDE.md").hasOurRule, true);
});

test("the shim masks plain credential assignments before a document goes to the model", async () => {
  const { buildPrompt } = await import("../plugins/agy-review/scripts/lib/shim.mjs");
  const p = buildPrompt([{ role: "user", content: 'password = "correct-horse-battery"\n//registry.npmjs.org/:_authToken=npm_abcdef123456\nplain text stays' }]);
  assert.ok(!p.includes("correct-horse-battery") && !p.includes("npm_abcdef123456"));
  assert.ok(p.includes("plain text stays"));
});
