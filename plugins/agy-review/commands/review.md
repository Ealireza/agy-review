---
description: Independent Antigravity code review of git changes, a file, a line range, a function or a snippet
argument-hint: '[--base <ref> | --staged | --commit <sha> | --file <path[:A-B]> | --symbol <name> | --stdin] [--context "<purpose>"] [--model <id>] [--effort auto|low..max] [--fail-on high] [--format json] [focus text]'
disable-model-invocation: true
allowed-tools: Bash(bun:*), Bash(node:*), Bash(git:*), Read, Glob, Grep
---

Run an Antigravity code review and show the result.

Raw arguments: `$ARGUMENTS`

Runtime: prefer `bun` if it is installed (`bun --version`), otherwise `node` 18.18+. Arguments and results are identical.

Rules:
- This command is review-only. Do not fix anything, apply patches, or say you are about to change files.
- Follow the `agy-review` skill for targets, options and loops. Run this from the repository root, passing each raw argument as its own properly shell-quoted argument (never splice user text into another command):
  ```bash
  bun "${CLAUDE_PLUGIN_ROOT}/scripts/agy-review.mjs" <arguments>
  ```
- With no target arguments it reviews the uncommitted git changes. `--file`, `--symbol` and `--stdin` review exactly that code, without repository access.
- A review can take several minutes. Use a Bash timeout of 600000 ms, or `run_in_background: true` when `git diff HEAD --shortstat` shows more than about 10 files; then tell the user and do not poll.
- Return the script's stdout verbatim. Add nothing before or after it. If the user asked for JSON, return the JSON.
- On a non-zero exit show stderr and stop: `2` a prerequisite is missing (suggest `/agy-review:setup`; agentic reviews also need `/agy-review:verify` to have passed), `3` the working tree changed during the review (tell the user to inspect `git status`/`git diff`), `4` the review is inconclusive or incomplete and is **not** a pass (say so), `10` the `--fail-on` gate failed (the report above is still valid).
