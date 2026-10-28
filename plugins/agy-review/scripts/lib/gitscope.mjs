// For git targets: which lines did the change actually touch? Findings elsewhere are pre-existing context and must not gate.
import fs from "node:fs";
import path from "node:path";
import { sh } from "./util.mjs";

// Parses `git diff -U0` output into new-side line ranges, the +/- lines per file (evidence of removed code must belong to the
// cited file), and the list of deleted files (which have no new side and cannot be loaded).
export function parseDiff(text) {
  const regions = [], deleted = [], byFile = new Map();
  let oldFile = null, file = null;
  for (const l of text.split("\n")) {
    const o = /^--- (?:a\/)?(.+)$/.exec(l);
    if (o) { oldFile = o[1] === "/dev/null" ? null : o[1].replace(/\\/g, "/"); continue; }
    const f = /^\+\+\+ (?:b\/)?(.+)$/.exec(l);
    if (f) {
      file = f[1] === "/dev/null" ? null : f[1].replace(/\\/g, "/");
      if (!file && oldFile) deleted.push(oldFile);
      if (!byFile.has(file ?? oldFile)) byFile.set(file ?? oldFile, []);
      continue;
    }
    const key = file ?? oldFile;
    const h = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/.exec(l);
    if (h && file) {
      const start = +h[1], len = h[2] === undefined ? 1 : +h[2];
      // A pure deletion has no new lines: attribute it to the lines around the gap.
      regions.push(len === 0 ? { label: file, start: Math.max(1, start - 2), end: start + 2 } : { label: file, start, end: start + len - 1 });
    } else if (key && /^[+-]/.test(l) && !/^(\+\+\+|---)/.test(l)) byFile.get(key)?.push(l.slice(1));
  }
  return { regions, deleted, byFile };
}

// kind: working | staged | base | commit.
export function changeScope(cwd, { kind, ref, paths = [] }) {
  const tail = paths.length ? ["--", ...paths] : [];
  const cmds = [];
  if (kind === "base") cmds.push(["diff", "-U0", `${ref}...HEAD`, ...tail], ["diff", "-U0", "HEAD", ...tail]);
  else if (kind === "commit") cmds.push(["show", "-U0", "--format=", ref, ...tail]);
  else if (kind === "staged") cmds.push(["diff", "-U0", "--cached", ...tail]);
  else cmds.push(["diff", "-U0", "HEAD", ...tail]);
  const regions = [], deleted = [], diffByFile = new Map();
  for (const c of cmds) {
    const r = sh("git", c, cwd);
    if (r.status !== 0) continue;
    const p = parseDiff(r.stdout);
    regions.push(...p.regions);
    deleted.push(...p.deleted);
    for (const [k, v] of p.byFile) diffByFile.set(k, [...(diffByFile.get(k) ?? []), ...v]);
  }
  if (kind === "working" || kind === "base") {
    const un = sh("git", ["ls-files", "--others", "--exclude-standard", ...tail], cwd).stdout.split("\n").filter(Boolean);
    for (const f of un.slice(0, 200)) {
      try {
        const text = fs.readFileSync(path.join(cwd, f), "utf8");
        if (!text.includes("\0") && text.length < 400_000) regions.push({ label: f.replace(/\\/g, "/"), start: 1, end: text.split("\n").length });
      } catch { /* unreadable untracked file: not in scope */ }
    }
  }
  return { regions, deleted: [...new Set(deleted)], diffByFile };
}
