---
name: agy-security
description: Security review of code with Google Antigravity (agy) and a deterministic pattern scanner. Reports findings with severity, priority, CWE, OWASP Top 10 category, exploitability, attack scenario and data flow, plus hard-coded secrets and bad-pattern signals, for a function, file, line range, snippet, diff or branch together with the code that calls it and that it calls. Use after writing or changing code that touches input, auth, files, processes, databases, network or crypto, when the user asks for a security audit or CVE/CWE style report, and as a gate in agent loops.
---

# agy-security

`--security` turns `agy-review` into a security reviewer. It adds a threat-model method (untrusted source to dangerous sink, with the controls in between), OWASP Top 10 (2021) and CWE mapping, a model-free scanner for bad patterns, and **related code**: what the target calls and who calls it, so the reviewer can see where the data comes from and where it goes.

Runtime: use `bun` if installed (`bun --version`), otherwise `node` 18.18+. Script: `bun "${CLAUDE_PLUGIN_ROOT}/scripts/agy-review.mjs" --security [target] [options]`.

## When to run it
- **After you write or change code** that handles: request data, files and paths, shell or process calls, SQL/NoSQL, HTML/templates, URLs and redirects, deserialization, authentication or authorisation, secrets, crypto, Android components/WebViews. Review the symbol you wrote **and** its callers and callees (`--related` is on by default for static targets).
- When the user asks for a security audit, a CWE/OWASP report, or "is this safe".
- As a gate in a loop: write, security-review, fix, re-review (below).

## Targets (same as agy-review)
`--symbol applyDiscount` · `--file src/api/login.ts:40-120` · `--stdin --lang python` · and for diffs `--staged`, `--base main`, `--commit <sha>` (agentic, read-only, needs `--install-guard`). Add `--context "who calls this and what is trusted"`: a security review is only as good as the stated trust boundary.

## What you get
Per finding: `severity`, `priority` (P0 before merge ... P3 optional), `category`, `confidence`, `exploitability` (`demonstrated`, `likely`, `conditional`, `theoretical`), `cwe`, `owasp`, `evidence` (exact code, verified to exist), `attack_scenario`, `data_flow` (`source -> ... -> sink`), `fix`. Plus `signals[]` (pattern hits that are leads, not findings), `related_code[]`, `rejected[]` (claims whose quoted code was not found), `limitations`, and `verdict`.

Honesty rules the tool enforces: a finding exists only if its quoted code is in the file; hard-coded secrets are reported by pattern, **redacted**, and never sent to the model; a `cve` is the model's claim and is always labelled `cve_verified: false`: confirm it on NVD or with `osv-scanner` / `npm audit` / `pip-audit` before you act on it. `theoretical` findings are capped at medium.

## Use it in a loop
```bash
# 1) write code, then review the symbol you wrote with its callers and callees
bun "$SCRIPT" --security --symbol saveUpload --context "filename and body come from an untrusted multipart request" \
  --format json --output sec.json --fail-on high            # exit 10 = a verified high/critical finding exists
# 2) fix every P0/P1 finding, then review again and compare
bun "$SCRIPT" --security --symbol saveUpload --format json --previous sec.json --output sec2.json --fail-on high
```
Stop when the exit code is `0` (and `verdict` is `approve` or `approve_with_comments`). Exit `4` (inconclusive) is **not** a pass: the reviewer's claims could not be verified or it did not cover the code: narrow the scope or use another model. Cap the loop at 3 to 5 rounds.

Standing rule for an agent: "after finishing a change that touches the areas above, run agy-security on each new or changed function with its related code, fix P0/P1 findings, and report anything left". Ready-made rules: `examples/` and `docs/SECURITY-REVIEW.md`.

## Model notes
Gemini's content filter sometimes refuses security prompts ("blocked by Gemini's filters"). If you did not choose a model, the tool retries once with the first non-Gemini model and says so. Some models (the Claude ones) do not accept `--effort`; the tool then uses the model default and reports it. For high-stakes code cross-check: `--models <a>,<b>`; findings both models report carry `agreement`.

## Present results
Show the Markdown report. Lead with P0/P1 findings and the attack scenario in plain words. Mention rejected claims, signals you could not confirm, and what was not reviewed. Do not call code "secure"; say what was and was not found in the scope reviewed. This does not replace dependency scanning, SAST in CI, or a human security review of critical code.
