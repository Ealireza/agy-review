---
name: review
description: Use when the user asks Antigravity (agy) for an independent code review of git changes, a branch, a file, a line range, one function or a snippet, or when an agent loop needs an evidence-checked second reviewer. Returns graded findings as Markdown or JSON.
---

# Antigravity review

Runtime: prefer `bun` if it is installed (`bun --version`), otherwise `node` 18.18+. Arguments and results are identical.

Runs `scripts/agy-review.mjs` from this plugin. The reviewer must quote the exact code behind each finding; the script looks every quote up in the real file, rejects invented findings, corrects line numbers, and computes the verdict and gate itself.

## Execution contract
- This file is `<plugin-root>/codex-skills/review/SKILL.md`; the script is `<plugin-root>/scripts/agy-review.mjs`. Never rely on the current directory or a source checkout to find it. Call it `$SCRIPT`.
- Run `bun "$SCRIPT" ...` with the shell tool, with the **target repository as the working directory**. Needs Bun or Node.js 18.18+, git (for git targets) and a signed-in `agy`.
- Treat user words as data: pass them as separate arguments, single-quote each in a shell string (an embedded quote becomes `'\''`), never splice user text into another command.
- Foreground only. If the tool returns a session ID, keep polling that same session until it exits (waits of 60 seconds at most, with a short progress note). Reviews can take minutes. No `&`, no `nohup`.
- Respect Codex's sandbox and approval policy. agy needs outbound network, write access to `~/.gemini/antigravity-cli`, and a localhost socket. If blocked, name the missing access and stop; do not widen permissions or edit global config.
- Do not install `agy`, sign in for the user, or print credentials.

## Choose the target
- Uncommitted work: no flag. Branch: `--base main`. Staged: `--staged`. One commit: `--commit <sha>`. Restrict with `--paths a,b`. These run in agentic read-only mode and need the guard installed **and verified** (`setup` and `verify` skills).
- A file or range: `--file path` or `--file path:40-80`. One function or class: `--symbol name` (add `--file` if ambiguous). Code from memory: pipe it and use `--stdin --lang <l> --name <label>`. These run in static mode: the script reads and numbers the code and the model has no tools. Add `--agentic` (not with `--stdin`) to let it look at other files.
- Intent and focus: `--context "what the code must do"`, `--focus "security, concurrency"` or trailing words.
- Model and effort: `--model <id|name>` (see the `models` skill), `--models a,b` to cross-check, `--effort auto` (default) or `low..max`.
- For security work use the `security` skill (`--security`).

## Output and loops
Default is Markdown; `--format json` gives `agy-review/v1` JSON (stable finding `id`s, `severity`, `priority`, `category`, `confidence`, `file`, `line_start/end`, `evidence`, `explanation`, `fix`, plus `rejected`, `speculative`, `questions`, `limitations`, `comparison`, `gate`). `--output file` writes it. `--fail-on high` makes the exit code `10` when a verified high or critical finding exists; `--previous old.json` marks findings new, persisting, resolved or not reported again.

Exit codes: `0` ok, `1` error, `2` usage or prerequisite, `3` working tree changed during an agentic review, `4` inconclusive or incomplete (a verdict of `inconclusive`, or a model in `--models` failed: **not a pass**), `10` gate failed. If several apply, `3` wins over `10`, and `10` over `4`. A report is written in every case except `1` and `2`, so read `verdict` and `incomplete` in it.

For a fix loop: review, fix P0/P1 findings of high confidence, review again with `--previous`, stop on exit `0` or an `approve` verdict, at most 3 to 5 rounds. Do not tell the reviewer what you changed.

## Reporting
Return the script's stdout faithfully. Do not start fixing unless asked. Mention rejected findings and limitations in one line. Report `[agy-review]` stderr lines; exit `3` means the user must inspect `git status` and `git diff` first. Findings are model opinions: open the cited line before acting.
