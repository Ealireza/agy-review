---
name: agy-review
description: Independent, evidence-checked code review by Google Antigravity (agy) of git changes, a branch, a file, a line range, a single function, or a pasted snippet. Returns graded findings (severity, priority, category, confidence, file:line, quoted evidence, fix) as Markdown or JSON, with an exit-code gate for loops. Use when the user asks for an Antigravity/agy/Gemini review or a second opinion, and from agents that need an independent reviewer.
---

# agy-review: an independent reviewer you can trust and chain

Runtime: prefer `bun` if it is installed (`bun --version`), otherwise `node` 18.18+. Arguments and results are identical.

Script: `bun "${CLAUDE_PLUGIN_ROOT}/scripts/agy-review.mjs" [target] [options]`

Why you can trust the report: the reviewer must quote the exact code behind every finding. The wrapper then looks that quote up in the real file. Findings whose quote does not exist are **rejected** (listed separately, never counted), wrong line numbers are **corrected**, and the verdict and the gate are computed by the wrapper from verified findings only.

## Pick the target
| You want to review | Use | Mode |
|---|---|---|
| uncommitted work | (nothing) | agentic read-only |
| a branch | `--base main` | agentic read-only |
| staged changes / one commit | `--staged` / `--commit <sha>` (+ `--paths a,b`) | agentic read-only |
| a file or a range | `--file src/a.kt` or `--file src/a.kt:40-80` | static |
| one function or class | `--symbol parseConfig` (+ `--file` if the name is ambiguous) | static |
| code you hold in memory | `... \| bun "$SCRIPT" --stdin --lang python --name snippet.py` | static |
| any of the above, with permission to look elsewhere | add `--agentic` | agentic read-only |

*Static* = the wrapper reads and numbers the code and the model gets no tools: nothing can be touched and nothing can be invented about other files. *Agentic* = the reviewer reads the repository itself through a guard hook that blocks every write (requires `--install-guard`; see `/agy-review:setup`).

## Give it intent
`--context "what this code must do"` makes correctness checkable against a purpose. `--focus "security, concurrency"` (or plain trailing words) steers attention without hiding critical issues.

## Choose model and effort
`--list-models`, then `--model <id|name>` or save it with `--set model=<id>` (see `agy-models`). `--models a,b` runs several models and marks findings by agreement. `--effort auto` (default) picks the effort from the size and risk of the code and says why; set `low..max` to override.

## Use it in a loop or from a subagent
```bash
# 1) review, machine-readable, fail the step on high or worse

Runtime: prefer `bun` if it is installed (`bun --version`), otherwise `node` 18.18+. Arguments and results are identical.
bun "$SCRIPT" --symbol applyDiscount --context "applies at most one coupon, never below 0" \
  --format json --fail-on high --output review.json ; echo $?      # 0 clean, 10 gate failed
# 2) fix the verified findings, then review again and compare

Runtime: prefer `bun` if it is installed (`bun --version`), otherwise `node` 18.18+. Arguments and results are identical.
bun "$SCRIPT" --symbol applyDiscount --format json --previous review.json --output review2.json
```
JSON (`agy-review/v1`): `verdict` (`approve`, `approve_with_comments`, `request_changes`, `inconclusive`), `counts`, `findings[]` (`id` stable across line shifts, `severity`, `priority`, `category`, `confidence`, `file`, `line_start`, `line_end`, `evidence`, `explanation`, `fix`, `cwe`, `scope`, `grounding`), `speculative[]` (low confidence, not counted), `rejected[]` (not found in the code), `questions[]`, `limitations[]`, `comparison {new, persisting, resolved}`, `gate`, `stats`.

Loop recipe: repeat *review -> fix findings with `priority` P0/P1 and confidence high -> review with `--previous`* until `verdict` is `approve` or `comparison.new` and `comparison.persisting` are empty, with a hard cap of 3 to 5 rounds. A fresh review each round is intentional: the reviewer is not told what you changed, so it stays independent. Do not argue with it; if a finding is wrong, record why and move on.

Exit codes: `0` ok, `1` error or unparseable reply, `2` usage or missing prerequisite, `3` working tree changed during an agentic review, `4` inconclusive (the reviewer's claims could not be verified, it did not cover the code, or a model failed: this is **not** a pass), `10` gate failed (`--fail-on`).

## How to present results to the user
Show the Markdown report as it is (`--format md`, the default). Do not start fixing unless asked. Mention rejected findings in one line (they signal how much the model invented) and any `limitations`. Findings are still model opinions: open the cited line before acting.

## Security review\nFor code that handles untrusted input, auth, files, processes, databases, network or crypto, use the `agy-security` skill (`--security`): same targets, plus OWASP/CWE mapping, exploitability, attack scenario, a model-free bad-pattern and secret scanner, and the callers and callees of the target as context.\n\n## Limits
Not an OS sandbox in agentic mode (see the README, security model). Code is sent to Google's model. Needs a signed-in `agy`, Node 18.18+, and git for git targets.
