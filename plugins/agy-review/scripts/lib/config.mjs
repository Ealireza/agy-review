// Settings persistence: command line > project (.agy-review.json at the git root) > user (~/.agy-review.json) > agy default.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { SEVERITIES, CONFIDENCES, UsageError, sh } from "./util.mjs";

const FILE = ".agy-review.json";
export const EFFORTS = ["low", "medium", "high", "xhigh", "max"];

// key -> normalizer/validator; returns the value to store or throws UsageError. Also used to validate command-line values.
export const VALIDATORS = {
  model: (v) => String(v),
  models: (v) => (Array.isArray(v) ? v : String(v).split(",")).map((s) => s.trim()).filter(Boolean),
  effort: (v) => (v === "auto" || EFFORTS.includes(v) ? v : bad("effort", ["auto", ...EFFORTS])),
  failOn: (v) => (v === "none" || SEVERITIES.includes(v) ? v : bad("failOn", ["none", ...SEVERITIES])),
  minConfidence: (v) => (CONFIDENCES.includes(v) ? v : bad("minConfidence", CONFIDENCES)),
  contextLines: (v) => (/^\d+$/.test(String(v)) && +v <= 400 ? +v : bad("contextLines", ["0-400"])),
  timeout: (v) => (Number.isFinite(+v) && +v >= 1 && +v <= 240 ? +v : bad("timeout", ["1-240 minutes"])),
  startLine: (v) => (/^\d+$/.test(String(v)) && +v >= 1 ? +v : bad("start-line", ["a positive integer"])),
  focus: (v) => String(v),
  // translation defaults
  to: (v) => String(v), variant: (v) => String(v), tone: (v) => String(v), audience: (v) => String(v), glossary: (v) => String(v),
  // keeping a graphify graph fresh with Antigravity
  graphifyModel: (v) => String(v),
  graphifyEffort: (v) => (EFFORTS.includes(v) ? v : bad("graphifyEffort", EFFORTS)),
  graphifyConcurrency: (v) => (/^\d+$/.test(String(v)) && +v >= 1 && +v <= 8 ? +v : bad("graphifyConcurrency", ["1-8"])),
  graphifyLabels: (v) => (v === true || v === "true" ? true : v === false || v === "false" ? false : bad("graphifyLabels", ["true", "false"])),
};
function bad(key, allowed) { throw new UsageError(`Invalid value for ${key}. Allowed: ${allowed.join(", ")}`); }

export const CONFIG_KEYS = Object.keys(VALIDATORS).filter((k) => k !== "startLine"); // startLine is a command-line option only
export const validate = (key, value) => VALIDATORS[key](value);

export function gitRoot(cwd) {
  const r = sh("git", ["rev-parse", "--show-toplevel"], cwd);
  return r.status === 0 ? path.resolve(r.stdout.trim()) : null;
}

export function configPaths(cwd, home = os.homedir()) {
  return { project: path.join(gitRoot(cwd) ?? cwd, FILE), user: path.join(home, FILE) };
}

function readJson(p) {
  try { return JSON.parse(fs.readFileSync(p, "utf8").replace(/^﻿/, "")); } catch (e) {
    if (e.code === "ENOENT") return {};
    throw new UsageError(`Cannot read ${p}: ${e.message}`);
  }
}

// `model` and `models` are one setting: whichever file sets either one wins over every lower-precedence file.
export function loadConfig(cwd, home) {
  const p = configPaths(cwd, home);
  const user = readJson(p.user), project = readJson(p.project);
  const pair = (o) => "model" in o || "models" in o;
  const lowerUser = pair(project) ? Object.fromEntries(Object.entries(user).filter(([k]) => k !== "model" && k !== "models")) : user;
  const sources = {};
  for (const k of CONFIG_KEYS) sources[k] = k in project ? "project" : k in lowerUser ? "user" : null;
  // A hand-edited file must not smuggle in values the command line would refuse (timeout "bad", effort "x", ...).
  const values = { ...lowerUser, ...project };
  for (const k of Object.keys(values)) {
    if (!CONFIG_KEYS.includes(k)) throw new UsageError(`Unknown setting '${k}' in ${sources[k] === "project" ? p.project : p.user}. Known: ${CONFIG_KEYS.join(", ")}`);
    try { values[k] = VALIDATORS[k](values[k]); } catch (e) { throw new UsageError(`${e.message} (in ${sources[k] === "project" ? p.project : p.user})`); }
  }
  return { values, sources, paths: p };
}

export function setConfig(cwd, key, value, { global = false, home } = {}) {
  if (!CONFIG_KEYS.includes(key)) throw new UsageError(`Unknown setting '${key}'. Known: ${CONFIG_KEYS.join(", ")}`);
  const p = configPaths(cwd, home)[global ? "user" : "project"];
  const cur = readJson(p);
  cur[key] = VALIDATORS[key](value);
  if (key === "model") delete cur.models; else if (key === "models") delete cur.model; // never keep both in one file
  fs.writeFileSync(p, JSON.stringify(cur, null, 2) + "\n");
  return { path: p, value: cur[key] };
}

export function unsetConfig(cwd, key, { global = false, home } = {}) {
  const p = configPaths(cwd, home)[global ? "user" : "project"];
  const cur = readJson(p);
  delete cur[key];
  if (Object.keys(cur).length) fs.writeFileSync(p, JSON.stringify(cur, null, 2) + "\n"); else fs.rmSync(p, { force: true });
  return p;
}
