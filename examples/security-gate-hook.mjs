// Optional Claude Code Stop hook: when Claude finishes, security-review the uncommitted code changes and, if a verified high or
// critical finding exists, send it back to Claude so it fixes it before stopping. Works on Bun or Node. Untested by the author.
// Install: see examples/claude-code-hooks.json. Cost: one review (about a minute) each time Claude stops with uncommitted changes.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const SCRIPT = process.env.AGY_REVIEW_SCRIPT || path.join(os.homedir(), "agy-review", "plugins", "agy-review", "scripts", "agy-review.mjs");
const RT = process.versions.bun ? process.execPath : "bun";
let input = {};
try { input = JSON.parse(fs.readFileSync(0, "utf8") || "{}"); } catch { /* no payload */ }
if (input.stop_hook_active) process.exit(0); // we already sent findings back once: never loop

const cwd = input.cwd || process.cwd();
const changed = spawnSync("git", ["status", "--porcelain"], { cwd, encoding: "utf8" });
const CODE = /\.(py|js|mjs|cjs|jsx|ts|tsx|java|kt|kts|cs|go|rs|php|rb|swift|c|cc|cpp|h|hpp|sql|sh|ps1|xml|gradle)$/i;
if (changed.status !== 0 || !changed.stdout.split("\n").some((l) => CODE.test(l.trim()))) process.exit(0);

const run = spawnSync(RT, [SCRIPT, "--security", "--fail-on", "high", "--timeout", "10"], { cwd, encoding: "utf8", timeout: 12 * 60_000 });
if (run.status === 10) {
  process.stderr.write("agy-review found verified high or critical security issues in your uncommitted changes. Fix the P0/P1 findings below, then finish.\n\n" + run.stdout.slice(0, 12_000));
  process.exit(2); // exit 2 on a Stop hook = keep working, with this message
}
process.exit(0);
