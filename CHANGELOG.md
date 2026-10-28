# Changelog

## 1.0.1

New

- **graphify on Antigravity (`--graphify`, skills `agy-graphify` / `graphify`, command `/agy-review:graphify`):** keeps a graphify knowledge graph fresh through git hooks (`post-commit`, `post-merge`, `post-checkout`, `post-rewrite`) with **0 Claude or Codex tokens and no API key**. graphify's semantic extraction and community naming run on Antigravity through a small local OpenAI-compatible server; graphify's backend is pinned to it so it can never fall back to the coding agent. The model runs without the permission flag, so agy denies tool calls (agy's permission model, not an OS sandbox); documents are redacted for common secrets before they are sent. Actions: `setup`, `update`, `status`, `doctor`, `hook-install`, `hook-uninstall`, `rules`, `serve`. Settings: `graphifyModel`, `graphifyEffort`, `graphifyConcurrency`, `graphifyLabels`. See `docs/GRAPHIFY.md`
- `--version` and `--update-check`; an update guide in the README
- `--list-models` shows the `--effort` each model accepts (`--refresh` re-reads it)

Fixed

- **`--effort auto` could pick a value the model does not have** (`gemini-3.8-flash has no "xhigh" effort (available: low, medium, high)`). The effort is now matched to the model: agy is asked what each model accepts (a short check that is stopped as soon as agy answers, cached per model and agy version in `~/.agy-review-cache.json`), the value is brought to the nearest one the model accepts, models with the effort in their name and models without `--effort` are run without it, a stale cache is corrected from the error and retried once, and the report says what was really used (`effort.value`, `effort.reason`, `effort.per_model`)
- Hardening after an independent Codex review: atomic update lock with an owner token, git-reported exclude path (custom `core.hooksPath`), a failed extraction exits 1 instead of 2, a failed community naming step is flagged `partial`, safer capability-cache writes, plain `password=` and `_authToken=` assignments are masked, Windows Python discovery next to `Scripts`
- Documentation: translations rewritten with Codex in plain language, keeping terms such as agent, skill, hook, token and commit in English

Tests: 73 automated tests (effort handling, the local server, hooks, the update flow with a fake graphify and a fake agy).

## 1.0.0

Features

- Claude Code plugin: `/agy-review:review`, `:security`, `:proxy`, `:translate`, `:models`, `:setup`, `:verify`; skills `agy-review`, `agy-security`, `agy-proxy`, `agy-translate`, `agy-models`; sub-agents `agy-reviewer`, `agy-security`, `agy-worker`
- Codex plugin: skills `review`, `security`, `proxy`, `translate`, `models`, `setup`, `verify` (installed and discovered on Codex CLI 0.163.0)
- Antigravity plugin `readonly-review`: deny-by-default PreToolUse guard hook and the `readonly-code-review` skill
- Review targets: working tree, `--base`, `--staged`, `--commit`, `--file path[:A-B]`, `--symbol`, `--stdin`; static (no tools) or agentic (guarded, read-only)
- Evidence-checked reports: every finding's quoted code is looked up in the real file; invented findings rejected, wrong lines corrected; verdict, counts and gate computed by the script; `inconclusive` verdict (exit 4)
- Security review: OWASP/CWE, exploitability, attack scenario, data flow, secret and bad-pattern scanner, related code (callers and callees), CVE ids always labelled unverified
- Loops and CI: stable finding ids, `--previous` comparison, `--fail-on` gate, JSON reports
- Models and effort: `--list-models`, `--set model|models|effort`, per-project and per-user settings, cross-checking with several models, deterministic `--effort auto`, automatic retry without `--effort` for models that reject it, fallback from Gemini's content filter
- Tasks and translation: `--task`, `--preset translate` with tone, audience, glossary, chunking and verification that code, URLs, placeholders and structure survived
- Runs on Bun or Node 18.18+; documentation in 12 languages; GitHub Pages site

Fixes from two independent reviews (Opus and Codex), each with a regression test

- Grounding: duplicate handling could keep a low-confidence finding over a high-confidence one; generic evidence such as `return null;` anchored any claim; line-number prefixes copied by the model caused rejections; wrapped quotes resolved to the wrong span; removed-code evidence is now matched per file; an empty git scope no longer means "everything is in scope"
- Verdict: "everything rejected" or "model disagreed" is `inconclusive`, never `approve`
- Secrets: a private key is redacted through its END line; `ASIA`, `github_pat_`, `glpat-` tokens added; documentation placeholders ignored; minified lines are still scanned; secrets are redacted in anything echoed from the model; a secret found by the scanner is reported even if every model fails; agentic reviews warn that secrets cannot be redacted
- Guard: credential paths are refused in shell commands too; `git remote show` (network) refused; agentic reviews require a passing `--verify` recorded for the installed guard and agy version
- Working-tree check now fingerprints the content of untracked files and the staged diff
- Settings: values in hand-edited settings files are validated; `model`/`models` precedence is consistent; conflicting targets and flags are usage errors
- Translation: fenced code content is compared byte for byte; oversized paragraphs are split
- Hardening: the security schema is written to a private temp directory; temp cleanup no longer fails on Windows (`EBUSY`)

Known limits

- The agentic path with the real `--dangerously-skip-permissions` flag was not exercised by the author against a live agy; `verify` is the proof on your machine and is now mandatory for agentic reviews.
- The guard is a filter on tool names and command text, not an OS sandbox. git can run textconv/filter programs configured in a repository.
