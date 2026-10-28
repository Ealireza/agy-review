---
description: Translate text or files with Antigravity, with tone, audience and glossary, and verified code/URL/placeholder preservation
argument-hint: '[--to <language>] [--variant <v>] [--tone <t>] [--audience <a>] [--glossary <file>] [--input <file> | --stdin] [--output <file>] [--model <id>]'
disable-model-invocation: true
allowed-tools: Bash(bun:*), Bash(node:*), Read, Write, Glob, AskUserQuestion
---

Use the `agy-translate` skill to translate with Antigravity.

Raw arguments: `$ARGUMENTS`

Runtime: prefer `bun` if it is installed (`bun --version`), otherwise `node` 18.18+. Arguments and results are identical.

Follow the skill's interview: infer what you can from the request and the project, ask the user only for what is missing (target language and variant, tone, audience, terms to keep), propose defaults, then run
`bun "${CLAUDE_PLUGIN_ROOT}/scripts/agy-review.mjs" --preset translate --to <language> ...` with every argument properly shell-quoted. Report where the result was saved, the model and effort used, and every preservation warning.
