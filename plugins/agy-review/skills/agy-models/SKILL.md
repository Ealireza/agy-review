---
name: agy-models
description: List the models available in the user's Antigravity (agy), choose which one agy-review, agy-proxy and agy-translate should use, and save that choice for this project or globally. Use when the user wants to see, pick or change the model or reasoning effort, or asks "which model is used".
---

# agy-models

Runtime: prefer `bun` if it is installed (`bun --version`), otherwise `node` 18.18+. Arguments and results are identical.

Script: `bun "${CLAUDE_PLUGIN_ROOT}/scripts/agy-review.mjs" <option>`

1. **See what exists**: `--list-models`. The output marks the selected model with `*` and says whether it came from the project or user settings. Add `--format json` for a machine-readable list.
2. **Choose**: show the list to the user and let them pick. If they describe a preference ("the strongest", "the cheapest", "a Claude one"), map it to the listed names, say which you picked and why, and do not claim a quality ranking you cannot see in the list.
3. **Save**:
   - this project: `--set model=<id or display name>` (writes `.agy-review.json` at the git root; commit it if the team should share it);
   - every project: `--set model=<id> --global` (writes `~/.agy-review.json`);
   - several models for cross-checking reviews: `--set models=<id>,<id>`;
   - reasoning effort: `--set effort=auto` (default) or `low|medium|high|xhigh|max`;
   - remove: `--unset model` (add `--global` for the user file).
   The name is validated against `agy models` before it is saved.
4. **Check**: `--show-config` prints the effective settings and where each came from.

`--list-models` also shows what each model accepts for `--effort`, read from agy itself: the default model offers a list (for example `low | medium | high`), models with the effort in their name (`gemini-3.8-flash-high`) take no `--effort`, and the Claude models do not support it. Whatever effort is asked for is brought to the nearest value the model accepts and the report says what was used; never guess a value yourself. `--refresh` asks agy again.

Precedence for every run: command line, then project file, then user file, then agy's own default.

Effort `auto` is deterministic and always explained: reviews use the amount of code in scope (and a risk-sensitive focus raises it one step); tasks look at the wording (mechanical transforms low, reasoning-heavy high) and the input length. `max` is never chosen automatically.

Unsure which model suits a task? Do not guess from names. Run the same small review on two models with `--models a,b`: findings both report are marked with agreement.
