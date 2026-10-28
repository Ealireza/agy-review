---
name: translate
description: Use when the user wants text, documents, UI strings or READMEs translated or localised with Google Antigravity (agy), with the right tone, audience and glossary, and a check that code, URLs, placeholders and Markdown structure survived. Also usable from sub-agents and pipelines.
---

# agy translate

Runtime: prefer `bun` if it is installed (`bun --version`), otherwise `node` 18.18+. Arguments and results are identical.

Translates with an Antigravity model, then verifies with code that fenced code blocks, inline code, URLs, placeholders (`{{x}}`, `${x}`, `%s`, `%1$s`), HTML/XML tags and Markdown headings are identical to the source. Long texts are split on blank lines (never inside a code block) and translated in chunks with the same instructions.

## Execution contract
- This file is `<plugin-root>/codex-skills/translate/SKILL.md`; the script is `<plugin-root>/scripts/agy-review.mjs` (`$SCRIPT`). Run it with the shell tool, foreground, polling a returned session ID until it exits. Arguments are data: single-quote each one in shell strings.
- Respect Codex's sandbox and approval policy; if agy is blocked, name the missing access and stop.
- The text is sent to Google's model: do not translate confidential text without the user's agreement.

## Interview (ask only what you cannot infer; at most three questions at once, each with a recommended default)
Target language and regional variant (pt-BR vs pt-PT, Persian vs Dari, zh-CN vs zh-TW); source language if mixed; tone (formal, neutral, friendly, casual, technical, marketing, literary, legal); audience; terms to keep or fix (offer a glossary); input and output locations; model and effort (saved model else agy default; effort `auto`). Look at existing translations and the project's voice first.

## Run
```text
bun "$SCRIPT" --preset translate --to Persian --tone friendly --audience "new developers" --glossary glossary.json --input README.md --output docs/README.fa.md
echo "Save changes?" | bun "$SCRIPT" --preset translate --to German --variant de-DE --tone neutral --stdin --format json
```
Options: `--to`, `--from`, `--variant`, `--tone`, `--audience`, `--glossary <file>` (JSON `{"term":"translation","API":"="}` or CSV; `=` keeps the term), `--keep "a,b"`, `--notes "<free instructions>"`, `--input <file>`/`--stdin`, `--model`, `--effort`, `--strict` (exit `11` if a preservation check fails), `--format text|json`, `--output <file>`.

## Report
Say where the result is, the model and effort, and **every preservation warning** (`checks.issues`). Never claim a check passed when `checks.ok` is false. Machine checks cannot judge fluency: for important text suggest a native reader or a second run with another `--model`.
JSON is `agy-translate/v1` with `to`, `model`, `effort`, `chunks`, `output`, `checks`, `usage`.
