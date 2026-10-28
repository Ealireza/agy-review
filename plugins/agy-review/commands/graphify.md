---
description: Keep a graphify graph up to date on Antigravity (git hooks, zero Claude or Codex tokens, no API key)
argument-hint: 'setup [--yes] | update [--full] | status | doctor | hook-install | hook-uninstall | rules [--write-rules]'
disable-model-invocation: true
allowed-tools: Bash(bun:*), Bash(node:*), Bash(git:*), Read, AskUserQuestion
---

Use the `agy-graphify` skill.

Raw arguments: `$ARGUMENTS`

Runtime: prefer `bun` if it is installed (`bun --version`), otherwise `node` 18.18+. Arguments and results are identical.

Run from the repository root: `bun "${CLAUDE_PLUGIN_ROOT}/scripts/agy-review.mjs" --graphify <action> [options]` with each argument properly shell-quoted. With no argument run `doctor`, then offer `setup`.

- Ask before `setup --yes`: it adds the `openai` package to graphify's Python environment.
- `update --full` reads every doc and can take a long time: use a long Bash timeout or `run_in_background: true`.
- Never refresh the graph yourself with `/graphify --update` or `graphify extract`: that is what spends the user's tokens.
