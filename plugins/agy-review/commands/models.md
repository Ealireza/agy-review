---
description: List Antigravity models, choose one for reviews and tasks, and save the choice
argument-hint: '[list | set <model> [--global] | effort <level> | show]'
disable-model-invocation: true
allowed-tools: Bash(bun:*), Bash(node:*), AskUserQuestion
---

Use the `agy-models` skill.

Raw arguments: `$ARGUMENTS`

Runtime: prefer `bun` if it is installed (`bun --version`), otherwise `node` 18.18+. Arguments and results are identical.

- No argument or `list`: run `bun "${CLAUDE_PLUGIN_ROOT}/scripts/agy-review.mjs" --list-models`, show the list, and ask the user whether to save a choice (project or global).
- `set <model> [--global]`: `--set model=<model>` (plus `--global`).
- `effort <level>`: `--set effort=<level>`.
- `show`: `--show-config`.
