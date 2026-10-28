---
name: security
description: Use when the user wants a security review of code by Google Antigravity (agy): a function, file, line range, snippet, diff or branch together with the code that calls it and that it calls. Reports severity, priority, CWE, OWASP category, exploitability, attack scenario and data flow, hard-coded secrets and bad-pattern signals. Use after writing code that touches input, auth, files, processes, databases, network or crypto, and as a gate in agent loops.
---

# agy security review

Runtime: prefer `bun` if it is installed (`bun --version`), otherwise `node` 18.18+. Arguments and results are identical.

`--security` turns the review script into a security reviewer: threat-model method, OWASP Top 10 (2021) and CWE mapping, a model-free bad-pattern scanner, and related code (callees and callers) as context.

## Execution contract
- This file is `<plugin-root>/codex-skills/security/SKILL.md`; the script is `<plugin-root>/scripts/agy-review.mjs` (`$SCRIPT`). Run `bun "$SCRIPT" --security ...` (or `node`, 18.18+, if bun is not installed) with the shell tool, with the target repository as the working directory, foreground; if the tool returns a session ID keep polling it (60 seconds at most per wait).
- Arguments are data: separate arguments, single-quoted in shell strings. Respect Codex's sandbox and approval policy (agy needs outbound network and write access to `~/.gemini/antigravity-cli`); if blocked, name the missing access and stop.
- Code is sent to Google's model. Hard-coded secrets are redacted before sending and reported by pattern.

## Run
```text
bun "$SCRIPT" --security --symbol saveUpload --context "filename and body come from an untrusted request" --format json --output sec.json --fail-on high
bun "$SCRIPT" --security --file src/api/login.ts:40-120
bun "$SCRIPT" --security --staged          # agentic, needs the guard (setup skill)
bun "$SCRIPT" --security --symbol saveUpload --previous sec.json --format json --output sec2.json
```
State the trust boundary with `--context`; the review is only as good as that. Choose a model with `--model` (see the `models` skill); if Gemini's filter refuses and no model was named, the script retries once with a non-Gemini model and says so.

## Read the result
Findings carry `severity`, `priority`, `category`, `confidence`, `exploitability`, `cwe`, `owasp`, `evidence` (verified to exist), `attack_scenario`, `data_flow`, `fix`; also `signals`, `related_code`, `rejected`, `limitations`, `verdict`. A `cve` is the model's unverified claim (`cve_verified: false`): check NVD/OSV before acting. Exit codes: `0` ok, `1` error, `2` usage/prerequisite, `3` working tree changed (agentic), `4` inconclusive (not a pass), `10` gate failed.

## Loop
Write the code, run `--security` on each new or changed function, fix P0/P1 findings, re-run with `--previous`, stop on exit `0`, at most 5 rounds. Exit `4` means the claims could not be verified: narrow the scope or change the model.

## Report
Lead with P0/P1 findings and the attack scenario in plain words; mention rejected claims and what was not reviewed. Never state that code is "secure". This does not replace dependency scanning or a human review of critical code.
