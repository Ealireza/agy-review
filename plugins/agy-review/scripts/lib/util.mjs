import crypto from "node:crypto";
import { spawnSync } from "node:child_process";

export const EXIT = { ok: 0, error: 1, usage: 2, modified: 3, inconclusive: 4, gate: 10, checks: 11 };
export const SEVERITIES = ["critical", "high", "medium", "low", "nit"];
export const PRIORITIES = ["P0", "P1", "P2", "P3"];
export const CONFIDENCES = ["low", "medium", "high"];
export const CATEGORIES = ["correctness", "security", "reliability", "error-handling", "concurrency", "performance", "resource-management", "data-integrity", "api-contract", "compatibility", "testing", "design", "maintainability", "readability", "documentation", "observability", "accessibility", "other"];

export class UsageError extends Error {}

// 1 if a is newer than b, -1 if older, 0 if equal. Ignores any pre-release suffix.
export function compareVersions(a, b) {
  const p = (v) => String(v).replace(/^v/, "").split("-")[0].split(".").map((n) => parseInt(n, 10) || 0);
  const [x, y] = [p(a), p(b)];
  for (let i = 0; i < Math.max(x.length, y.length); i++) if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) > (y[i] ?? 0) ? 1 : -1;
  return 0;
}

export const sha = (s, n = 10) => crypto.createHash("sha1").update(s).digest("hex").slice(0, n);
export const norm = (s) => String(s ?? "").replace(/\s+/g, " ").trim();
export const sh = (cmd, args, cwd) => spawnSync(cmd, args, { cwd, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
export const sevRank = (s) => SEVERITIES.indexOf(s);

// Paths that must never be sent to a model, whoever asks for them.
export const SECRET_PATH = /(?:^|[\\/\s"'=~])(?:\.ssh|\.gnupg|\.aws)(?![\w.-])|id_(rsa|ed25519|ecdsa)|\.git-credentials/i;

// Last top-level JSON object in a string. Some models print a fenced draft before the schema-enforced object.
export function lastJsonObject(text) {
  const s = String(text ?? "").slice(0, 4_000_000);
  let best = null; // the parsed object that ends last; among equals, the outermost
  const close = (from) => { // index of the brace that closes the object starting at `from`, string-aware
    let depth = 0, inStr = false;
    for (let i = from; i < s.length; i++) {
      const ch = s[i];
      if (inStr) { if (ch === "\\") i++; else if (ch === '"') inStr = false; continue; }
      if (ch === '"') inStr = true;
      else if (ch === "{") depth++;
      else if (ch === "}" && --depth === 0) return i;
    }
    return -1;
  };
  for (let i = s.indexOf("{"); i >= 0; i = s.indexOf("{", i + 1)) {
    const end = close(i);
    if (end < 0) continue;
    let value;
    try { value = JSON.parse(s.slice(i, end + 1)); } catch { continue; } // prose with braces, or a fragment: try the next '{'
    if (!best || end > best.end || (end === best.end && i < best.start)) best = { start: i, end, value };
  }
  return best?.value ?? null;
}
