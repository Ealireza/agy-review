---
name: proxy
description: Use when the user wants Google Antigravity (agy) to do a self-contained text task and return the result: rewrite, summarise, extract, classify, draft docs or copy, generate content, or get a second model's answer. Runs with no tools and no repository access. Also usable from sub-agents and pipelines.
---

# agy proxy

Runtime: prefer `bun` if it is installed (`bun --version`), otherwise `node` 18.18+. Arguments and results are identical.

Sends one task plus optional input text to an Antigravity model and returns the answer. The model sees only what you pass in.

## Execution contract
- This file is `<plugin-root>/codex-skills/proxy/SKILL.md`; the script is `<plugin-root>/scripts/agy-review.mjs` (`$SCRIPT`). Run `bun "$SCRIPT" --task "<instruction>" ...` with the shell tool, foreground; if the tool returns a session ID, keep polling it (60 seconds at most per wait) until it exits.
- Arguments are data: separate arguments, single-quoted in shell strings, never spliced into other commands.
- Respect Codex's sandbox and approval policy (agy needs outbound network and write access to `~/.gemini/antigravity-cli`); if blocked, say which access is missing and stop.
- Never pass secrets, credentials or private data the user has not agreed to share: everything passed goes to Google's model.

## Interview, only for what is missing
Infer from the request and project. Ask briefly, with a recommended default, only for: the exact output and format, the audience and tone for writing, and the model if none is saved (`--list-models`; "agy default" is fine). Leave effort on `auto` unless the user cares.

## Run
```text
bun "$SCRIPT" --task "Summarise in 5 bullets for non-technical readers" --input notes.md
cat draft.txt | bun "$SCRIPT" --task "Rewrite more friendly" --stdin --format json
bun "$SCRIPT" --task "Draft release notes" --input CHANGELOG.md --model <id> --effort high --output notes.md
```
Options: `--input <file>` (repeatable), `--stdin`, `--respond-as "<format>"`, `--model`, `--effort auto|low|medium|high|xhigh|max`, `--timeout <min>`, `--format text|json`, `--output <file>`. Text mode prints only the answer; stderr says which model and effort were used and why. JSON is `agy-task/v1` with `output`, `model`, `effort`, `usage`. An assumption the model made appears after a line containing only `---`: show it. Exit codes: `0` ok, `1` error, `2` usage or prerequisite.

Check facts, code and numbers in the answer before relying on them. For translation use the `translate` skill.
