// Everything that talks to the agy binary: detection, model list, one headless run.
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { UsageError } from "./util.mjs";

// AGY_REVIEW_AGY_BIN lets tests substitute a fake agy (a .mjs file is run with node).
const bin = () => process.env.AGY_REVIEW_AGY_BIN || "agy";
function command(args) {
  const b = bin();
  return /\.(mjs|js)$/.test(b) ? [process.execPath, [b, ...args]] : [b, args];
}

export function agyVersion() {
  const [c, a] = command(["--version"]);
  const r = spawnSync(c, a, { encoding: "utf8" });
  return r.status === 0 ? r.stdout.trim() : null;
}

// `agy models` prints "<id>\t<Display name>" lines (progress goes to stderr).
export function listModels() {
  const [c, a] = command(["models"]);
  const r = spawnSync(c, a, { encoding: "utf8", timeout: 60_000 });
  if (r.status !== 0) throw new UsageError(`'agy models' failed: ${(r.stderr || r.error?.message || "").trim()}`);
  return r.stdout.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
    const [id, ...rest] = l.split("\t");
    return { id: id.trim(), name: rest.join("\t").trim() || id.trim() };
  });
}

export function resolveModel(input, models) {
  const q = String(input).trim().toLowerCase();
  const hit = models.find((m) => m.id.toLowerCase() === q) ?? models.find((m) => m.name.toLowerCase() === q);
  if (!hit) throw new UsageError(`Unknown model '${input}'. Available:\n${models.map((m) => `  ${m.id}  (${m.name})`).join("\n")}`);
  return hit;
}

// Runs one headless review. The prompt travels over stdin (no argv size limit).
// agentic=true lets agy read the repository: it then needs --dangerously-skip-permissions, so the caller must have verified the guard.
// ---------------------------------------------------------------- effort capabilities
// Every model has its own idea of --effort: some take a list (the default model: low, medium, high), some have the effort in their
// name (gemini-3.8-flash-high) and reject --effort, some (the Claude ones) do not support it at all. agy says which, in about four
// seconds and before any billing, so we ask it instead of guessing, and remember the answer per model and agy version.

export const EFFORT_SCALE = ["low", "medium", "high", "xhigh", "max"];
const cachePath = () => path.join(os.homedir(), ".agy-review-cache.json");
const readCache = () => { try { return JSON.parse(fs.readFileSync(cachePath(), "utf8")); } catch { return {}; } };

// Reads agy's own validation message. Returns { kind: "list", values } | { kind: "in-id" } | { kind: "none" } | null (not an effort error).
export function parseEffortError(text) {
  const msg = String(text ?? "");
  let m;
  if ((m = /has no "?\w+"? effort \(available: ([^)]*)\)/.exec(msg))) return { kind: "list", values: m[1].split(",").map((s) => s.trim()).filter((s) => EFFORT_SCALE.includes(s)) };
  if (/conflicts with --effort/.test(msg)) return { kind: "in-id" };
  if (/--effort is not supported/.test(msg)) return { kind: "none" };
  return null;
}

// Nearest value the model accepts: the highest allowed one not above the wish, else the lowest allowed one.
export function clampEffort(desired, caps, model) {
  const name = model || "the default model";
  if (!caps || caps.kind === "all") return { effort: desired };
  if (caps.kind === "none") return { effort: undefined, note: `${name} does not support --effort, its own default is used` };
  if (caps.kind === "in-id") {
    const built = /-(low|medium|high|xhigh|max)$/.exec(model ?? "")?.[1];
    return { effort: undefined, builtIn: built, note: `effort is part of the model name${built ? ` (${built})` : ""}, so ${name} takes no --effort` };
  }
  const values = EFFORT_SCALE.filter((e) => caps.values.includes(e));
  if (!values.length || values.includes(desired)) return { effort: desired };
  const d = EFFORT_SCALE.indexOf(desired);
  const below = values.filter((e) => EFFORT_SCALE.indexOf(e) <= d);
  const effort = below.length ? below[below.length - 1] : values[0];
  return { effort, note: `${desired} is not available for ${name} (it offers ${values.join(", ")}), so ${effort} is used` };
}

// Asks agy what the model accepts by requesting an effort no model here has ("max"). A model that does accept it starts a run,
// which is killed at once.
function probeCaps(model) {
  return new Promise((resolve) => {
    const args = ["--output-format", "stream-json", "--print-timeout", "1m", "-p", "x"];
    if (model) args.push("--model", model);
    args.push("--effort", "max");
    const [c, a] = command(args);
    const child = spawn(c, a, { stdio: ["ignore", "pipe", "pipe"] });
    let buf = "", done = false;
    const finish = (v) => { if (done) return; done = true; clearTimeout(timer); try { child.kill(); } catch { /* already gone */ } resolve(v); };
    const timer = setTimeout(() => finish({ kind: "all" }), 12_000);
    const on = (d) => { buf += d; const p = parseEffortError(buf); if (p) finish(p); };
    child.stdout.on("data", on);
    child.stderr.on("data", on);
    child.on("error", () => finish(null));
    // Exit 0 without an effort error means the model took "max" (and answered): that is a result worth caching too.
    child.on("close", (code) => finish(parseEffortError(buf) ?? (code === 0 ? { kind: "all" } : null)));
  });
}

export async function effortCaps(model, { refresh = false } = {}) {
  const key = `${agyVersion() ?? "?"}|${model || "default"}`;
  const cache = readCache();
  if (!refresh && cache[key]) return cache[key];
  const caps = await probeCaps(model);
  if (caps) {
    try { fs.writeFileSync(cachePath(), JSON.stringify({ ...readCache(), [key]: caps }, null, 2)); } catch { /* read-only home: just do not cache */ }
  }
  return caps;
}

export async function runAgy(opts) {
  let note = null, builtIn = null, effort = opts.effort;
  if (effort) {
    const c = clampEffort(effort, await effortCaps(opts.model), opts.model);
    ({ effort } = c); note = c.note ?? null; builtIn = c.builtIn ?? null;
  }
  let r = await runOnce({ ...opts, effort });
  // The cached answer can be out of date (agy updated its models). Read the error, correct the cache and try once more.
  const err = r.status !== 0 && !r.response ? parseEffortError(`${r.stderr}\n${r.error ?? ""}`) : null;
  if (effort && err) {
    try { const k = `${agyVersion() ?? "?"}|${opts.model || "default"}`; fs.writeFileSync(cachePath(), JSON.stringify({ ...readCache(), [k]: err }, null, 2)); } catch { /* not cached */ }
    const c = clampEffort(opts.effort, err, opts.model);
    ({ effort } = c); note = c.note ?? null; builtIn = c.builtIn ?? null;
    r = await runOnce({ ...opts, effort });
  }
  // Gemini's content filter sometimes refuses security-related prompts. Surface it so the caller can choose another model.
  return { ...r, filtered: /blocked by (gemini|the model)['’]?s? filters?/i.test(r.response), effortUsed: effort ?? builtIn ?? null, effortNote: note };
}

function runOnce({ prompt, schemaPath, model, effort, timeoutMin, cwd, agentic }) {
  return new Promise((resolve) => {
    const args = ["--input-format", "stream-json", "--output-format", "stream-json", "--disable-slash-commands", "--print-timeout", `${timeoutMin}m`];
    if (schemaPath) args.push("--json-schema", schemaPath);
    if (agentic) args.unshift("--dangerously-skip-permissions");
    if (model) args.push("--model", model);
    if (effort) args.push("--effort", effort);
    const workdir = agentic ? cwd : fs.mkdtempSync(path.join(os.tmpdir(), "agy-static-"));
    const [c, a] = command(args);
    const child = spawn(c, a, { cwd: workdir, stdio: ["pipe", "pipe", "pipe"] });
    let out = "", err = "", timedOut = false;
    const timer = setTimeout(() => { timedOut = true; child.kill(); }, (timeoutMin + 1) * 60_000);
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    child.stdin.on("error", () => {});
    child.stdin.end(JSON.stringify({ event: "user", message: { content: prompt } }) + "\n");
    const done = (extra) => {
      clearTimeout(timer);
      if (!agentic) cleanup(workdir);
      resolve({ ...parseStream(out), stderr: err.trim(), timedOut, ...extra });
    };
    child.on("error", (e) => done({ status: 1, stderr: e.message }));
    child.on("close", (status) => done({ status }));
  });
}

// On Windows the folder can stay locked for a moment after agy exits (EBUSY). A leftover temp dir must never fail a review.
function cleanup(dir) {
  try { fs.rmSync(dir, { recursive: true, force: true, maxRetries: 8, retryDelay: 150 }); } catch { /* best effort */ }
}

export function parseStream(out) {
  let response = "", error = null, usage = null, denied = [];
  const steps = [], blocked = [];
  for (const line of out.split("\n")) {
    let e; try { e = JSON.parse(line); } catch { continue; }
    if (e.event === "result") {
      response = e.result?.response ?? "";
      error = e.result?.error ?? null;
      usage = e.result?.usage ?? null;
      denied = e.result?.denied_actions ?? [];
      if (e.result?.status && e.result.status !== "SUCCESS" && !error) error = e.result.status;
    }
    const s = e.event === "step_update" ? e.step_update : null;
    if (s?.tool_name && s.state !== "ACTIVE") {
      const p = s.tool_info?.parameters ?? {};
      const msg = s.tool_info?.error?.message ?? null;
      steps.push({ tool: s.tool_name, target: p.CommandLine ?? p.AbsolutePath ?? p.TargetFile ?? p.Path ?? "", error: msg });
      if (/Read-only review mode/.test(msg ?? "")) blocked.push(p.CommandLine ?? p.TargetFile ?? s.tool_name);
    }
  }
  return { response: response.trim(), error, usage, denied, steps, blocked };
}
