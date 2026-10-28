---
name: agy-translate
description: Translate text, documents, UI strings or whole READMEs with Google Antigravity (agy), with the right tone, audience, glossary and a check that code, URLs, placeholders and Markdown structure survived. Use whenever the user asks to translate something "with agy / Antigravity / Gemini", or to localise docs and strings. Works from subagents and pipelines.
---

# agy-translate

Runtime: prefer `bun` if it is installed (`bun --version`), otherwise `node` 18.18+. Arguments and results are identical.

Translates with an Antigravity model and then **verifies** the result with code: fenced code blocks, inline code, URLs, placeholders (`{{x}}`, `${x}`, `%s`, `%1$s`), HTML/XML tags and Markdown headings must be identical to the source. Long texts are split on blank lines (never inside a code block) and translated chunk by chunk with the same instructions, so terminology stays consistent.

Script: `bun "${CLAUDE_PLUGIN_ROOT}/scripts/agy-review.mjs" --preset translate --to <language> [options]`

## Step 1: interview (ask only what you cannot infer)
Look at the request, the file, and the project first: the existing translations, the README language, the product's voice. Then collect, asking in as few questions as possible and offering a recommended default for each:

| Need | Ask when | Typical default |
|---|---|---|
| Target language, and variant (pt-BR vs pt-PT, Persian vs Dari, zh-CN vs zh-TW, es-ES vs es-MX) | not stated, or the language has regional variants | the variant the project already uses |
| Source language | the text is mixed or ambiguous | auto-detect |
| Tone / register: formal, neutral, friendly, casual, technical, marketing, literary, legal | not stated | match the source; "friendly-professional" for docs |
| Audience (developers, end users, children, lawyers...) | it changes word choice | infer from the document |
| Terms to keep or fix (product names, API names, a glossary) | the text has domain terms | keep code and product names; offer to build a glossary |
| Where the text is and where the result goes | not clear | input file in, `<name>.<lang>.<ext>` out |
| Model and effort | the user cares or has several models saved | the saved model, else agy default; effort `auto` |

If the user says "just do it", use the defaults and state them in one line. Never ask more than three questions at once.

## Step 2: glossary (optional but recommended for anything longer than a page)
Write `glossary.json` (`{"repo": "مخزن", "API": "="}`; `=` means keep as written) or a CSV (`term,translation`). Reuse the project's glossary file if one exists. Offer to save it next to the translations.

## Step 3: run
```bash
bun "$SCRIPT" --preset translate --to Persian --tone friendly --audience "new developers" \
  --glossary glossary.json --input README.md --output docs/README.fa.md
# strings from stdin, JSON result for pipelines

Runtime: prefer `bun` if it is installed (`bun --version`), otherwise `node` 18.18+. Arguments and results are identical.
echo "Save changes?" | bun "$SCRIPT" --preset translate --to German --variant de-DE --tone neutral --stdin --format json
```
Options: `--to`, `--from`, `--variant`, `--tone`, `--audience`, `--glossary <file>`, `--keep "term1,term2"`, `--notes "<free instructions>"`, `--input <file>` / `--stdin`, `--model`, `--effort auto|...`, `--strict` (exit 11 if a preservation check fails), `--format text|json`, `--output <file>`.

## Step 4: report
- Show where the result is saved, the model and effort used, and **every preservation warning** (stderr, or `checks.issues` in JSON). Do not hide a failed check; offer to re-run with `--strict` or a stronger model.
- For RTL targets (Persian, Arabic, Hebrew, Urdu) keep code blocks and identifiers unchanged and in LTR.
- Skim a few sentences yourself; machine checks cannot judge fluency. For important text suggest a second model: `--models` is for reviews, so run the translation twice with `--model` and compare, or have a native speaker check.

## JSON result
`{ "schema": "agy-translate/v1", "to", "model", "effort", "chunks", "output", "checks": {"ok": bool, "issues": [...]}, "usage" }`. Exit codes: `0` ok (warnings possible), `1` error, `2` usage/prerequisite, `11` preservation check failed with `--strict`.

## Privacy
The text is sent to Google's model. Do not translate confidential text without the user's agreement.
