---
name: verify
description: Use when the user wants proof that Antigravity reviews are read-only on this machine, after installing the plugin or updating agy.
---

# Antigravity read-only verification

Runtime: prefer `bun` if it is installed (`bun --version`), otherwise `node` 18.18+. Arguments and results are identical.

Script: `<plugin-root>/scripts/agy-review.mjs`, where this file is `<plugin-root>/codex-skills/verify/SKILL.md`. Run `node <script> --verify` through the shell tool, foreground; keep polling the same session until it exits (up to about 5 minutes). Respect Codex's sandbox and approval policy; if blocked, report which access is missing (outbound network, `~/.gemini/antigravity-cli` writes, localhost socket) and stop.

It makes one small live agy call inside a throwaway temp folder: agy is asked to read a file, then to write a file, redirect into a file, and delete a file. It passes only if the read works and all three write attempts are blocked.

Show the output verbatim (five PASS/FAIL lines). If any line is `FAIL`, tell the user not to use the review skill on code they care about and to open an issue with the output and their `agy --version`.
