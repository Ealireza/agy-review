---
name: agy-proxy
description: Delegate a self-contained task to Google Antigravity (agy) and get the result back as text or JSON. Use for second opinions, bulk or mechanical text work (rewrite, summarise, classify, extract, draft copy, generate content), offloading work to a different model, or when the user says "use Antigravity / agy / Gemini for this". Works from subagents and loops.
---

# agy-proxy: use Antigravity as a worker

Runtime: prefer `bun` if it is installed (`bun --version`), otherwise `node` 18.18+. Arguments and results are identical.

`agy-proxy` sends one task, plus optional input text, to an Antigravity model and returns its answer. It runs with **no tools and no repository access**: the model sees only what you pass in, so it cannot read, change or break anything.

Script: `bun "${CLAUDE_PLUGIN_ROOT}/scripts/agy-review.mjs" --task "<instruction>" [options]`

## When to use it
- The user asks for Antigravity/agy/Gemini explicitly, or wants a different model's take.
- A self-contained transform: translate (use `agy-translate`), rewrite, summarise, extract, classify, name things, draft docs/release notes/marketing copy, generate test data.
- You are inside a loop or subagent and want a cheap independent worker.

Do **not** use it for: editing the repository, anything needing files you have not passed in, secrets, or code review (use `agy-review`).

## Interview, but only for what is missing
Infer everything you can from the request and the project. Ask the user (one short question each, with a recommended default) only when the answer changes the result and cannot be inferred:
1. **What exactly to produce**, and the output format (plain text, Markdown, JSON, a length or word limit).
2. **Audience and tone**, for any writing task.
3. **Model**, only if the user has not chosen one: run `--list-models` and offer the list; "agy default" is fine. If they pick one, offer to save it (`--set model=<id>`, add `--global` for all projects).
4. **Effort**, only if they care: otherwise leave it on `auto` (the default), which picks low for mechanical transforms and higher for reasoning-heavy tasks and says why on stderr.

## Run it
```bash
# input from a file, result to stdout

Runtime: prefer `bun` if it is installed (`bun --version`), otherwise `node` 18.18+. Arguments and results are identical.
bun "$SCRIPT" --task "Summarise in 5 bullet points for a non-technical reader" --input notes.md
# input from stdin, JSON result for chaining

Runtime: prefer `bun` if it is installed (`bun --version`), otherwise `node` 18.18+. Arguments and results are identical.
cat draft.txt | bun "$SCRIPT" --task "Rewrite in a friendlier tone" --stdin --format json
# choose model and effort, write to a file

Runtime: prefer `bun` if it is installed (`bun --version`), otherwise `node` 18.18+. Arguments and results are identical.
bun "$SCRIPT" --task "Draft release notes" --input CHANGELOG.md --model <id> --effort high --output notes.md
```
Options: `--input <file>` (repeatable), `--stdin`, `--respond-as "<format spec>"`, `--model <id|name>`, `--effort auto|low|medium|high|xhigh|max`, `--timeout <min>`, `--format text|json`, `--output <file>`.

## Results
- Text mode prints the answer only; status goes to stderr (`model`, `effort` and why).
- `--format json` prints `{ "schema": "agy-task/v1", "model", "effort": {"value","reason","source"}, "output", "usage" }`.
- Exit codes: `0` ok, `1` no answer or error, `2` bad usage or missing prerequisite.
- If the model states an assumption, it is after a line containing only `---` at the end. Show it to the user.

## Rules
- Pass only what the task needs. Everything you pass is sent to Google's model. Never pass secrets, credentials or private data the user has not agreed to share.
- Treat the answer as model output: check facts, code and numbers before you rely on them.
- For long inputs split the work yourself or use `agy-translate`, which chunks safely.
- Run it in the foreground; large tasks can take minutes.
