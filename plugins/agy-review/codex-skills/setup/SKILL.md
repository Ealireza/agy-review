---
name: setup
description: Use when the user wants to set up, check or repair the Antigravity review integration: verify agy, git and Node, and install the read-only guard hook.
---

# Antigravity review setup

Runtime: prefer `bun` if it is installed (`bun --version`), otherwise `node` 18.18+. Arguments and results are identical.

Same script as the `review` skill: `<plugin-root>/scripts/agy-review.mjs`, where this file is `<plugin-root>/codex-skills/setup/SKILL.md`. Run it with `node` through the shell tool, foreground, from any directory. Respect Codex's sandbox and approval policy; if a step is blocked, report which access is missing and stop.

1. Run `node <script> --check` and show the output. It lists `agy CLI`, `git` and `read-only guard` as OK or FAIL.
2. If the guard is `missing` or `outdated`, tell the user in one sentence that `--install-guard` copies a small hook into `~/.gemini/config/plugins/readonly-review` (this is outside the workspace, so Codex may ask for approval), then run `node <script> --install-guard`.
3. If `agy` is missing, do not install it. Tell the user to install the Antigravity CLI from https://antigravity.google/cli and run `agy` once in a terminal to sign in.
4. Finish by recommending the `verify` skill, which proves on this machine that writes are blocked.
