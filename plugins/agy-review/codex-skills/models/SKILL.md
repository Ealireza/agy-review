---
name: models
description: Use when the user wants to see the models available in their Antigravity (agy), choose which one reviews, tasks and translations use, set reasoning effort, and save the choice for the project or globally.
---

# agy models

Runtime: prefer `bun` if it is installed (`bun --version`), otherwise `node` 18.18+. Arguments and results are identical.

Script: `<plugin-root>/scripts/agy-review.mjs` (this file is `<plugin-root>/codex-skills/models/SKILL.md`); call it `$SCRIPT`. Run with the shell tool, foreground. Respect Codex's sandbox and approval policy; `--list-models` needs outbound network.

1. `bun "$SCRIPT" --list-models` shows `id  display name`, with `*` on the selected model and where it came from. Add `--format json` for machines.
2. Let the user choose. Map a described preference to the listed names and say why; do not claim quality rankings that the list does not show.
3. Save: `--set model=<id|name>` for this project (`.agy-review.json` at the git root), add `--global` for every project (`~/.agy-review.json`); `--set models=a,b` for cross-checking reviews; `--set effort=auto|low|medium|high|xhigh|max`; `--unset model`. Names are validated against `agy models`.
4. `--show-config` prints effective settings and their source. Precedence: command line, project file, user file, agy default.

`--effort auto` is deterministic and explained: reviews scale with the code in scope (a risk-sensitive focus adds a step), tasks with wording and input length; `max` is never automatic.
