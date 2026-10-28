// Keep a graphify knowledge graph fresh with Antigravity instead of the coding agent or a paid API.
//
// graphify does all of its deterministic work itself (tree-sitter, clustering, report, manifest, cache, merge). Only two steps need a
// language model: semantic extraction of docs/papers, and naming communities. graphify can send those to any OpenAI-compatible
// server, so this module starts a tiny local one that answers with `agy` (see shim.mjs) and pins graphify's backend to it. Without
// that pin graphify picks a backend by itself, and inside a coding agent that is the coding agent: that is where the tokens go.
//
// The model behind the shim never gets a tool or a file. The only things written to disk are written by graphify (into graphify-out/)
// and by this module (hooks, a lock file, a log). No write or exec rights are given to any model.
import { spawn, spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { agyVersion } from "./agy.mjs";
import { startShim } from "./shim.mjs";
import { UsageError, sh } from "./util.mjs";

const OUT = "graphify-out";
const START = "# agy-graphify-hook-start", END = "# agy-graphify-hook-end";
const EVENTS = ["post-commit", "post-merge", "post-checkout", "post-rewrite"];
const RULE_START = "<!-- agy-graphify-rule-start -->", RULE_END = "<!-- agy-graphify-rule-end -->";
export const AGY_HOME = () => process.env.AGY_REVIEW_HOME || path.join(os.homedir(), ".agy-review");

// ---------------------------------------------------------------- finding and running graphify

// AGY_GRAPHIFY_CMD overrides the command: "python -m graphify", or a JSON array when a path has spaces:
// ["C:\\Program Files\\Python\\python.exe","-m","graphify"]. Default: the `graphify` on PATH.
export function graphifyArgv() {
  const raw = (process.env.AGY_GRAPHIFY_CMD || "graphify").trim();
  let c;
  if (raw.startsWith("[")) { try { c = JSON.parse(raw); } catch { throw new UsageError("AGY_GRAPHIFY_CMD starts with [ but is not valid JSON"); } } else c = raw.split(/\s+/);
  return { cmd: c[0], pre: c.slice(1) };
}

function run(args, { cwd, env, timeoutMs = 0, onData } = {}) {
  const { cmd, pre } = graphifyArgv();
  return new Promise((resolve) => {
    const child = spawn(cmd, [...pre, ...args], { cwd, env: { ...process.env, PYTHONIOENCODING: "utf-8", ...env }, stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
    let out = "";
    const timer = timeoutMs ? setTimeout(() => child.kill(), timeoutMs) : null;
    const take = (d) => { out += d; onData?.(String(d)); };
    child.stdout.on("data", take);
    child.stderr.on("data", take);
    child.on("error", (e) => { if (timer) clearTimeout(timer); resolve({ status: 127, out: out + e.message }); });
    child.on("close", (status) => { if (timer) clearTimeout(timer); resolve({ status, out }); });
  });
}

export function graphifyVersion() {
  const { cmd, pre } = graphifyArgv();
  const r = spawnSync(cmd, [...pre, "--version"], { encoding: "utf8", timeout: 30_000, windowsHide: true });
  if (r.status !== 0 && !r.stdout) return null;
  return (r.stdout.match(/(\d+\.\d+\.\d+)/)?.[1]) ?? "unknown";
}

// The python that graphify itself runs on: it, not ours, must be able to `import openai`.
function graphifyPython(root) {
  if (process.env.AGY_GRAPHIFY_PYTHON) return process.env.AGY_GRAPHIFY_PYTHON;
  try { const p = fs.readFileSync(path.join(root, OUT, ".graphify_python"), "utf8").trim(); if (p) return p; } catch { /* not written */ }
  const { cmd, pre } = graphifyArgv();
  if (pre.length && /^python/i.test(cmd)) return cmd;
  const where = spawnSync(process.platform === "win32" ? "where" : "which", [cmd], { encoding: "utf8" }).stdout.split("\n")[0]?.trim();
  if (where) {
    const dir = path.dirname(where);
    for (const c of [path.join(dir, "python.exe"), path.join(dir, "..", "python.exe"), path.join(dir, "python"), path.join(dir, "python3"), path.join(dir, "..", "Scripts", "python.exe"), path.join(dir, "..", "bin", "python")]) if (fs.existsSync(c)) return c;
    try { const first = fs.readFileSync(where, "utf8").split("\n")[0]; if (first.startsWith("#!")) return first.slice(2).trim().split(/\s+/)[0]; } catch { /* binary launcher */ }
    // uv tool launchers on Windows live in ~/.local/bin; the environment is under the uv tools directory.
    const uv = spawnSync("uv", ["tool", "dir"], { encoding: "utf8" });
    if (uv.status === 0) for (const c of [path.join(uv.stdout.trim(), "graphifyy", "Scripts", "python.exe"), path.join(uv.stdout.trim(), "graphifyy", "bin", "python")]) if (fs.existsSync(c)) return c;
  }
  return null;
}

export function doctor(root) {
  const rows = [];
  const gv = graphifyVersion();
  rows.push({ name: "graphify", ok: !!gv, detail: gv ? `version ${gv}` : "not found. Install it: uv tool install graphifyy   (or: pipx install graphifyy)" });
  const av = agyVersion();
  rows.push({ name: "agy", ok: !!av, detail: av ?? "not found. Install the Antigravity CLI and run `agy` once to sign in" });
  const py = gv ? graphifyPython(root) : null;
  let hasOpenAI = process.env.AGY_GRAPHIFY_HAS_OPENAI === "1"; // advanced override, also used by the tests
  if (py && !hasOpenAI) hasOpenAI = spawnSync(py, ["-c", "import importlib.util,sys;sys.exit(0 if importlib.util.find_spec('openai') else 1)"], { timeout: 30_000, windowsHide: true }).status === 0;
  rows.push({ name: "openai package in graphify's Python", ok: (!!py || process.env.AGY_GRAPHIFY_HAS_OPENAI === "1") && hasOpenAI, detail: !py && !hasOpenAI ? "could not find graphify's Python (set AGY_GRAPHIFY_PYTHON)" : hasOpenAI ? (py ?? "assumed present") : `missing in ${py}. Add it: uv tool install --force "graphifyy[openai]"   (pipx: pipx inject graphifyy openai)` });
  rows.push({ name: "graph built", ok: fs.existsSync(path.join(root, OUT, "graph.json")), detail: fs.existsSync(path.join(root, OUT, "graph.json")) ? `${OUT}/graph.json` : `no ${OUT}/graph.json yet: build the first graph once with  --graphify update --full` });
  return rows;
}

// ---------------------------------------------------------------- hooks

function hooksDir(root) {
  const r = sh("git", ["rev-parse", "--git-path", "hooks"], root);
  if (r.status !== 0) throw new UsageError("Not inside a git repository");
  return path.resolve(root, r.stdout.trim());
}

const hookBlock = (event) => `${START}
# Installed by: agy-review --graphify hook-install
# Updates the graphify graph in the background with Antigravity: no Claude or Codex tokens, no API key.
# Skip once: AGY_GRAPHIFY_SKIP=1 git ...      Remove: agy-review --graphify hook-uninstall
if [ -z "$AGY_GRAPHIFY_SKIP" ] && [ -z "$GRAPHIFY_SKIP_HOOK" ]${event === "post-checkout" ? ' && [ "$3" = "1" ]' : ""}; then
  _AGYR="\${AGY_REVIEW_HOME:-$HOME/.agy-review}/runtime/scripts/agy-review.mjs"
  if [ -f "$_AGYR" ]; then
    if command -v bun >/dev/null 2>&1; then bun "$_AGYR" --graphify update --detach --quiet >/dev/null 2>&1 || true
    elif command -v node >/dev/null 2>&1; then node "$_AGYR" --graphify update --detach --quiet >/dev/null 2>&1 || true
    fi
  fi
fi
${END}
`;

const stripBlock = (text, start, end) => {
  const a = text.indexOf(start);
  if (a < 0) return text;
  const b = text.indexOf(end, a);
  return (text.slice(0, a) + (b < 0 ? "" : text.slice(b + end.length))).replace(/\n{3,}/g, "\n\n");
};

// A self-contained copy of this tool, so the hook keeps working when the plugin updates or moves.
export function installRuntime(pluginRoot) {
  const dest = path.join(AGY_HOME(), "runtime");
  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(dest, { recursive: true });
  for (const d of ["scripts", "prompts", "schema", "antigravity-plugin", ".claude-plugin"]) fs.cpSync(path.join(pluginRoot, d), path.join(dest, d), { recursive: true });
  return dest;
}

export async function hookInstall({ root, pluginRoot, keepGraphifyHook = false }) {
  const dir = hooksDir(root);
  fs.mkdirSync(dir, { recursive: true });
  const notes = [];
  if (!keepGraphifyHook) {
    // graphify's own hooks rebuild the code graph only, and ours does that too (and more). Two writers on one graph would race, so
    // ours replaces theirs. `graphify hook install` restores them.
    const r = await run(["hook", "uninstall"], { cwd: root });
    notes.push(r.status === 0 ? "graphify's own git hooks removed (ours do the same work and more)" : "could not remove graphify's own hooks (graphify missing?)");
  }
  const runtime = installRuntime(pluginRoot);
  // Our log, lock and status files stay out of `git status` without touching the project's .gitignore (local to this clone).
  try {
    const gp = sh("git", ["rev-parse", "--git-path", "info/exclude"], root);
    const ex = gp.status === 0 ? path.resolve(root, gp.stdout.trim()) : path.join(path.dirname(dir), "info", "exclude");
    const have = fs.existsSync(ex) ? fs.readFileSync(ex, "utf8") : "";
    if (!have.includes("graphify-out/.agy-update.*")) { fs.mkdirSync(path.dirname(ex), { recursive: true }); fs.appendFileSync(ex, `${have && !have.endsWith("\n") ? "\n" : ""}graphify-out/.agy-update.*\ngraphify-out/.agy-debug/\n`); }
  } catch { /* cosmetic */ }
  for (const ev of EVENTS) {
    const f = path.join(dir, ev);
    let text = fs.existsSync(f) ? fs.readFileSync(f, "utf8") : "#!/bin/sh\n";
    if (!text.startsWith("#!")) text = "#!/bin/sh\n" + text;
    text = stripBlock(text, START, END).replace(/\s*$/, "\n") + "\n" + hookBlock(ev);
    fs.writeFileSync(f, text, { mode: 0o755 });
    try { fs.chmodSync(f, 0o755); } catch { /* not meaningful on Windows */ }
  }
  return { hooks: EVENTS.map((e) => path.join(dir, e)), runtime, notes };
}

export async function hookUninstall({ root, restoreGraphify = false }) {
  const dir = hooksDir(root), removed = [];
  for (const ev of EVENTS) {
    const f = path.join(dir, ev);
    if (!fs.existsSync(f)) continue;
    const text = fs.readFileSync(f, "utf8");
    if (!text.includes(START)) continue;
    const rest = stripBlock(text, START, END);
    if (rest.replace(/#!.*\n?/, "").trim() === "") fs.rmSync(f); else fs.writeFileSync(f, rest);
    removed.push(ev);
  }
  let restored = false;
  if (restoreGraphify) restored = (await run(["hook", "install"], { cwd: root })).status === 0;
  return { removed, restored };
}

export function hookStatus(root) {
  const dir = hooksDir(root);
  const rows = EVENTS.map((ev) => {
    const f = path.join(dir, ev);
    const t = fs.existsSync(f) ? fs.readFileSync(f, "utf8") : "";
    return { event: ev, ours: t.includes(START), graphify: t.includes("# graphify-hook-start") || t.includes("# graphify-checkout-hook-start") };
  });
  let last = null;
  try { last = JSON.parse(fs.readFileSync(path.join(root, OUT, ".agy-update.json"), "utf8")); } catch { /* never ran */ }
  return { rows, last, runtimeInstalled: fs.existsSync(path.join(AGY_HOME(), "runtime", "scripts", "agy-review.mjs")) };
}

// ---------------------------------------------------------------- agent rules (CLAUDE.md / AGENTS.md)

export const AGENT_RULE = `${RULE_START}
## graphify is kept fresh by Antigravity
The graphify graph is updated automatically by git hooks that run \`agy-review --graphify update\` on Antigravity (a cheaper model, no API key).
- Do NOT run \`/graphify --update\`, \`graphify extract\` or \`graphify update\` yourself to refresh the graph, and do not rebuild it after code changes: that spends your tokens for nothing.
- Read \`graphify-out/GRAPH_REPORT.md\` and query the graph as usual. If it looks stale, run \`agy-review --graphify update\` (it detaches and returns at once) and keep working.
${RULE_END}
`;

export function ruleFiles(root) {
  return ["CLAUDE.md", "AGENTS.md"].map((f) => {
    const p = path.join(root, f);
    const t = fs.existsSync(p) ? fs.readFileSync(p, "utf8") : null;
    return { file: f, path: p, exists: t !== null, hasGraphifySection: t !== null && /^##\s+graphify\b/im.test(t.replace(RULE_START, "")), hasOurRule: t !== null && t.includes(RULE_START) };
  });
}

export function writeRules(root) {
  const written = [];
  for (const r of ruleFiles(root)) {
    if (!r.exists) continue; // never create CLAUDE.md or AGENTS.md just for this
    const t = fs.readFileSync(r.path, "utf8");
    fs.writeFileSync(r.path, stripBlock(t, RULE_START, RULE_END).replace(/\s*$/, "\n") + "\n" + AGENT_RULE);
    written.push(r.file);
  }
  return written;
}

// ---------------------------------------------------------------- the update itself

const alive = (pid) => { try { process.kill(pid, 0); return true; } catch { return false; } };

function acquire(root) {
  fs.mkdirSync(path.join(root, OUT), { recursive: true });
  const lock = path.join(root, OUT, ".agy-update.lock");
  const mine = JSON.stringify({ pid: process.pid, at: Date.now(), owner: crypto.randomUUID() });
  for (let attempt = 0; attempt < 2; attempt++) {
    try { fs.writeFileSync(lock, mine, { flag: "wx" }); break; } catch (e) {
      if (e.code !== "EEXIST") throw e;
      let cur = null;
      try { cur = JSON.parse(fs.readFileSync(lock, "utf8")); } catch { /* unreadable: treat as stale */ }
      // A live owner keeps the lock for as long as an extraction may legitimately run (3 h); only a dead owner's lock is taken over.
      if (cur && alive(cur.pid) && Date.now() - cur.at < 4 * 3600_000) { fs.writeFileSync(path.join(root, OUT, ".agy-update.again"), String(Date.now())); return null; }
      fs.rmSync(lock, { force: true });
      if (attempt) return null;
    }
  }
  return () => { try { if (fs.readFileSync(lock, "utf8") === mine) fs.rmSync(lock, { force: true }); } catch { /* already gone */ } };
}

function logger(root, quiet) {
  const file = path.join(root, OUT, ".agy-update.log");
  try { if (fs.existsSync(file) && fs.statSync(file).size > 1_000_000) fs.renameSync(file, file + ".1"); } catch { /* best effort */ }
  return (msg) => {
    const line = `[${new Date().toISOString()}] ${msg}`;
    try { fs.appendFileSync(file, line + "\n"); } catch { /* log is optional */ }
    if (!quiet) process.stderr.write(line + "\n");
  };
}

// opts: { root, settings: { model, effort, concurrency, labels }, full, quiet, debug }
export async function update(opts) {
  const { root, settings = {}, full = false, quiet = false, debug = false } = opts;
  const rows = doctor(root).filter((r) => r.name !== "graph built");
  const bad = rows.filter((r) => !r.ok);
  if (bad.length) throw new UsageError(bad.map((r) => `${r.name}: ${r.detail}`).join("\n"));
  const hasGraph = fs.existsSync(path.join(root, OUT, "graph.json"));
  if (!hasGraph && !full) return { skipped: "no graph yet: build it once with  --graphify update --full" };
  const release = acquire(root);
  if (!release) return { skipped: "another update is running; it will run once more when it finishes" };
  const log = logger(root, quiet);
  const t0 = Date.now();
  let shim;
  try {
    for (let round = 0; round < 3; round++) {
      fs.rmSync(path.join(root, OUT, ".agy-update.again"), { force: true });
      shim = await startShim({ model: settings.model, effort: settings.effort ?? "low", concurrency: settings.concurrency ?? 3, timeoutMin: 15, cwd: root, debugDir: debug ? path.join(root, OUT, ".agy-debug") : undefined });
      // Pin every LLM-using step to the local agy server so graphify can never fall back to the coding agent or a paid key.
      const env = { GRAPHIFY_BACKEND: "ollama", OLLAMA_BASE_URL: shim.url, OLLAMA_API_KEY: shim.token, OLLAMA_MODEL: "agy", GRAPHIFY_SKIP_HOOK: "1", GRAPHIFY_MAX_RETRIES: "2" };
      const modelArg = settings.model ? `agy:${settings.model}` : "agy";
      log(`graphify update via Antigravity (model ${settings.model ?? "agy default"}, effort ${settings.effort ?? "low"})`);
      const ex = await run(["extract", ".", "--backend", "ollama", "--model", modelArg, "--max-concurrency", String(settings.concurrency ?? 3), "--api-timeout", "900", ...(full ? ["--force"] : [])], { cwd: root, env, timeoutMs: 3 * 3600_000, onData: (d) => { if (!quiet && debug) process.stderr.write(d); } });
      const summary = (ex.out.match(/incremental summary:[^\n]*/) ?? [""])[0] || (ex.out.match(/\d+ code, \d+ docs[^\n]*/) ?? [""])[0];
      if (ex.status !== 0) {
        const why = (ex.out.split("\n").filter((l) => /error|failed|requires/i.test(l)).slice(-3).join(" | ") || ex.out.slice(-300)).slice(0, 400);
        log(`extract failed (exit ${ex.status}): ${why}`);
        throw new Error(`graphify extract failed: ${why}`);
      }
      // "incremental summary: 3 files cached/unchanged, 1 re-extracted, 0 deleted"
      const reextracted = +(/(\d+) re-extracted/.exec(summary)?.[1] ?? 0), deleted = +(/(\d+) deleted/.exec(summary)?.[1] ?? 0);
      const changed = reextracted > 0 || deleted > 0 || full;
      let labelNote = "labels skipped";
      if (changed) {
        const args = ["cluster-only", ".", ...(settings.labels === false ? ["--no-label"] : ["--backend=ollama", `--model=${modelArg}`, "--max-concurrency=1"])];
        const cl = await run(args, { cwd: root, env, timeoutMs: 3600_000 });
        labelNote = cl.status === 0 ? "report and communities refreshed" : `cluster-only failed (exit ${cl.status}); graph.json is updated, GRAPH_REPORT.md may be stale`;
        if (cl.status !== 0) log(labelNote);
      } else labelNote = "nothing changed";
      const st = shim.stats;
      const result = { ok: true, partial: labelNote.startsWith("cluster-only failed") || undefined, at: new Date().toISOString(), duration_s: Math.round((Date.now() - t0) / 1000), summary: summary.trim(), model: settings.model ?? "agy default", effort: settings.effort ?? "low", agy_calls: st.calls, agy_failed: st.failed, input_tokens: st.input_tokens, output_tokens: st.output_tokens, steps: labelNote };
      fs.writeFileSync(path.join(root, OUT, ".agy-update.json"), JSON.stringify(result, null, 2));
      log(`done in ${result.duration_s}s: ${summary.trim() || "no changes"}; ${st.calls} agy call(s), ${st.input_tokens} in / ${st.output_tokens} out tokens on Antigravity, 0 on Claude/Codex`);
      await shim.stop(); shim = null;
      if (!fs.existsSync(path.join(root, OUT, ".agy-update.again"))) return result;
      log("a commit landed during the update: running once more");
    }
    return { ok: true, note: "stopped after 3 rounds" };
  } catch (e) {
    try { fs.writeFileSync(path.join(root, OUT, ".agy-update.json"), JSON.stringify({ ok: false, at: new Date().toISOString(), error: String(e.message ?? e).slice(0, 500) }, null, 2)); } catch { /* ignore */ }
    throw e;
  } finally {
    if (shim) await shim.stop();
    release();
  }
}

// Start the same run in a background process and return at once, so a git hook never waits for a model.
export function detach(argv, env = {}) {
  const child = spawn(process.execPath, argv, { detached: true, stdio: "ignore", windowsHide: true, cwd: process.cwd(), env: { ...process.env, ...env } });
  child.unref();
  return child.pid;
}
