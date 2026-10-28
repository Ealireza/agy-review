---
description: Delegate a self-contained task (rewrite, summarise, draft, extract...) to Antigravity and return the result
argument-hint: '<instruction> [--input <file>] [--stdin] [--model <id>] [--effort auto|low..max] [--format json] [--output <file>]'
disable-model-invocation: true
allowed-tools: Bash(bun:*), Bash(node:*), Read, Glob, AskUserQuestion
---

Use the `agy-proxy` skill to run this task on Antigravity.

Raw arguments: `$ARGUMENTS`

Runtime: prefer `bun` if it is installed (`bun --version`), otherwise `node` 18.18+. Arguments and results are identical.

Follow the skill: ask only for what is missing and cannot be inferred (output format, audience and tone for writing, model if none is saved), then run
`bun "${CLAUDE_PLUGIN_ROOT}/scripts/agy-review.mjs" --task "<instruction>" [options]` with every argument properly shell-quoted. Return the result as the script prints it, and tell the user which model and effort were used (stderr line).
