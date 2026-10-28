# Using agy-review from agents, sub-agents and pipelines

Everything the skills do is a plain CLI call with a stable contract, so any agent, framework or CI job can use it. This page is that contract.

```text
node plugins/agy-review/scripts/agy-review.mjs <mode and options>
```

Three modes, all selected by flags on the same script:

| Mode | Selected by | Reads | Model tools | Output |
|---|---|---|---|---|
| Review, git | no target flag, `--base`, `--staged`, `--commit` | repository, read-only | yes, behind the guard | report (`agy-review/v1`) |
| Review, code | `--file`, `--symbol`, `--stdin` | only the code the script reads and numbers | none (static) | report (`agy-review/v1`) |
| Task | `--task "..."` or `--preset translate` | only the text you pass | none | text, or `agy-task/v1` / `agy-translate/v1` |

## 1. Who calls it

| Caller | How |
|---|---|
| Claude Code main agent | slash commands `/agy-review:review`, `:proxy`, `:translate`, `:models`, or the skills of the same names |
| Claude Code sub-agents | the plugin ships `agy-reviewer` (independent reviewer) and `agy-worker` (translation and text tasks); spawn them with the Agent tool, or list the skills in your own agent's definition |
| Codex | skills `agy-review:review`, `:proxy`, `:translate`, `:models` |
| Any other agent, script or CI | call the CLI; parse stdout JSON; use the exit code |

## 2. Review contract

Targets (pick one): none = uncommitted changes, `--base <ref>`, `--staged`, `--commit <sha>` (all take `--paths a,b`), `--file <path[:A-B]>` (repeatable), `--symbol <name> [--file <path>]`, `--stdin [--lang l] [--name label] [--start-line N]`. Add `--agentic` to a code target to let the reviewer open other files (guarded, read-only).

Inputs that make the review better: `--context "what the code is supposed to do"`, `--focus "security, concurrency"`, `--context-lines N` (static, default 40).

Selection: `--model <id|name>`, `--models a,b` (cross-check), `--effort auto|low|medium|high|xhigh|max`, `--timeout <minutes>`.

Results: `--format md|json`, `--output <file>` (with JSON, stdout then carries a one-line summary), `--previous <report.json>`.

### Report fields (`"schema": "agy-review/v1"`)

| Field | Meaning |
|---|---|
| `verdict` | `approve`, `approve_with_comments`, `request_changes`, `inconclusive` (nothing verified although findings were rejected, the model disagreed, the code was not covered, or a model failed: **not a pass**). **Computed by the script** from verified findings; `model_verdicts` holds what each model said |
| `counts` | verified, in-scope findings per severity, and `total` |
| `findings[]` | verified, in-scope findings, sorted by severity, then priority |
| `speculative[]` | verified but below `--min-confidence` (default medium); not counted, not gating |
| `rejected[]` | findings whose quoted evidence does not exist in the cited file, with `reason`; never counted |
| `questions[]`, `limitations[]` | what the reviewer could not decide or see |
| `comparison` | with `--previous`: `new`, `persisting`, `resolved` finding ids |
| `gate` | `{fail_on, min_confidence, failed}` |
| `effort` | `{value, reason, source}`; `source` is `auto` or `user` |
| `stats` | duration, per-model usage, guard blocks, rejected count |

Finding fields: `id` (hash of the file, the normalised source text of the first cited line and which occurrence of that text it is: stable when lines shift or the model words its quote differently; two different problems on one line get different ids), `title`, `severity` (`critical|high|medium|low|nit`), `priority` (`P0..P3`), `category`, `confidence` (`high|medium|low`), `file`, `line_start`, `line_end`, `evidence` (exact code), `explanation`, `fix`, `cwe`, `scope` (`in` or `context`), `grounding` (`exact`, `relocated`, `diff` for removed code quoted from the change, `pattern` for scanner findings), and with several models `agreement {count,total,models}` and `severity_by_model`.

Severity is the impact if the problem is real; priority is when it must be fixed (P0 before merge, P1 before release, P2 planned, P3 optional). The combinations are enforced: critical is P0; high is P0 or P1; medium is P1 or P2; low is P2 or P3; nit is P3. Findings in the categories `readability` and `documentation` are capped at low.

### Why you can rely on it
1. The reviewer must return a JSON object matching `schema/review.schema.json` (enforced by `--json-schema`); the script then checks every field it relies on (severity, title, explanation, file, evidence) and rejects a finding that lacks one.
2. Every finding carries an exact `evidence` quote. The script searches the quote in the real file (whitespace-insensitive, also across wrapped lines). No match: rejected. Match on a different line: the line numbers are corrected. Evidence too short or too generic to anchor (under 12 non-space characters, or no identifier other than a keyword such as `return` or `null`): rejected. A quote that matches several places, none near the cited line: rejected as ambiguous.
3. Findings outside the requested range are tagged `scope: "context"` and never gate.
4. Low-confidence findings are listed separately and never gate.
5. Static targets give the model the numbered code only and no tools, so it cannot reason about files it was not shown.
6. The verdict, counts and gate are computed by the script, never taken from the model.

What remains possible: a correct quote with a wrong conclusion. The quote proves the code exists, not that the explanation is right. That is why every finding has a concrete scenario and why you should read the cited lines before acting.

### Exit codes
`0` ok (report written) · `1` error, timeout or an unparseable model reply · `2` usage error or missing prerequisite · `3` the working tree changed during an agentic review · `4` inconclusive or incomplete (a verdict of `inconclusive`, or a model in `--models` failed) · `10` the `--fail-on` gate failed (the report is still valid). If several apply, `3` wins over `10`, and `10` over `4`; a report is written in every case except `1` and `2`, so read `verdict` and `incomplete` in it · `11` translation preservation check failed with `--strict`.

## 3. Loop recipes

### Implement, review, fix
```text
round = 0
loop:
  node agy-review.mjs --symbol <fn> --context "<spec>" --format json --output r.json [--previous prev.json] --fail-on high
  if exit == 0: stop (clean)
  if exit == 10: fix every finding with priority P0/P1 and confidence high; keep prev.json = r.json
  if exit == 1 or 2: stop and report the error
  round += 1; stop at 3-5 rounds
```
Keep the reviewer independent: never put your own explanation of the change into `--context`; describe the *requirement*, not the diff. A finding that persists after you disagree with it should be recorded as a rejected suggestion with your reason, not argued with the reviewer.

### Review a snippet that only exists in memory
```text
printf '%s' "$code" | node agy-review.mjs --stdin --lang typescript --name draft.ts --format json
```
`--start-line N` makes the line numbers match where the snippet lives in a bigger file.

### Fan out: one reviewer per module
Run one process per file or symbol in parallel; they do not share state. Each produces its own report; combine by concatenating `findings` and recomputing your own gate.

### Cross-check with two models
`--models a,b` (or `--set models=a,b`). Findings both models report get `agreement.count` 2 and are less likely to be noise; findings from a single model are marked 1/2.

## 4. Task contract

`--task "<instruction>"` with optional `--input <file>` (repeatable), `--stdin`, `--respond-as "<format spec>"`, `--model`, `--effort`, `--format text|json`, `--output`. The model gets no tools and no repository. Text mode prints only the answer; status goes to stderr. JSON (`agy-task/v1`): `model`, `effort`, `output`, `usage`.

### Translation preset
`--preset translate --to <language> [--from l] [--variant v] [--tone t] [--audience a] [--glossary file] [--keep "a,b"] [--notes "..."] [--strict]`.
JSON (`agy-translate/v1`): `to`, `model`, `effort`, `chunks`, `output`, `checks {ok, issues[]}`, `usage`. The script verifies that fenced code, inline code, URLs, placeholders, tags and headings match the source, and that the output length is plausible. Texts longer than about 8,000 characters are split on blank lines, never inside a code block.

Tones: formal, neutral, friendly, casual, technical, marketing, literary, legal (any other word is passed through as written).

## 5. Models and effort
`--list-models` (add `--format json`), `--set model=<id|name> [--global]`, `--set models=a,b`, `--set effort=...`, `--unset key`, `--show-config`. Settings live in `.agy-review.json` (git root) and `~/.agy-review.json`; precedence is command line, project, user, agy default. Setting keys: `model`, `models`, `effort`, `failOn`, `minConfidence`, `contextLines`, `timeout`, `focus`, plus the translation defaults `to`, `variant`, `tone`, `audience`, `glossary`.

`--effort auto` is a deterministic heuristic, not a model call. Reviews: under 40 lines in scope medium, under 300 high, more xhigh; a risk-sensitive focus (security, auth, crypto, concurrency, payments, migrations) adds one step; agentic reviews are at least high. Tasks: mechanical transforms (translate, rewrite, summarise, extract, classify) low; reasoning wording (design, analyse, compare, plan, debug, audit) high; otherwise medium; very long input adds a step. `max` is never chosen automatically. The chosen value and the reason are always reported.

## 5b. Effort per model, and graphify

`--effort` is matched to the model before every run (agy is asked what the model accepts; the answer is cached per model and agy version). The report's `effort` is `{value, reason, source}` and, for several models, `{value: "per model", per_model: {...}}`: `value` is what was really used (`model default` when the model takes no `--effort`). `--list-models --format json` returns `effort: {kind: "list"|"in-id"|"none"|"all", values}` per model.

`--graphify <action>` keeps a graphify graph fresh on Antigravity (see `docs/GRAPHIFY.md`). Agents must not refresh a graph themselves: call `--graphify update --detach --quiet` and carry on. `--graphify serve` exposes a local OpenAI-compatible endpoint backed by agy for other tools.

## 6. Security review\n`--security` on any review target runs the security method (see `docs/SECURITY-REVIEW.md`). Extra finding fields: `owasp`, `cve` + `cve_verified` (always `false`), `exploitability`, `attack_scenario`, `data_flow`; extra report fields: `review_type: "security"`, `signals[]`, `related_code[]`. `--related` / `--no-related` control callers and callees as context (default on with `--security` for static targets). Hard-coded secrets are found by pattern, redacted before anything is sent, and reported as findings with `grounding: "pattern"`.\n\n## 7. Safety notes for agent authors
- Everything you pass (code, text, glossary) is sent to Google's model. Do not pass secrets.
- Static targets and tasks cannot touch the file system. Agentic reviews run agy with `--dangerously-skip-permissions` behind a deny-by-default guard hook that is not an OS sandbox; see the README security model. The script refuses to run them without the guard and warns (exit 3) if the working tree changed.
- Paths under `.ssh`, `.gnupg`, `.aws` and files named like private keys are refused as inputs.
- Treat every finding as a hypothesis from a model, even a verified one.
