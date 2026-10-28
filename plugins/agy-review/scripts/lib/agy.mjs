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
export async function runAgy(opts) {
  const r = await runOnce(opts);
  // Some models (for example the Claude ones) reject --effort. Retry once without it and say so; never fail a review over it.
  if (opts.effort && r.status !== 0 && !r.response && /--effort[^\n]*not supported/i.test(`${r.stderr}\n${r.error ?? ""}`)) {
    return { ...(await runOnce({ ...opts, effort: undefined })), effortDropped: true };
  }
  // Gemini's content filter sometimes refuses security-related prompts. Surface it so the caller can choose another model.
  return { ...r, filtered: /blocked by (gemini|the model)['’]?s? filters?/i.test(r.response) };
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
