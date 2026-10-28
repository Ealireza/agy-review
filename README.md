# agy-review

**An independent reviewer that has to show its work.** Code review, security review, task delegation and translation by Google Antigravity (`agy`), from Claude Code, Codex or any terminal. Read-only, no permission prompts, and every finding is checked against your real code before you see it.

**English** · [فارسی](docs/README.fa.md) · [简体中文](docs/README.zh-CN.md) · [Русский](docs/README.ru.md) · [Español](docs/README.es.md) · [العربية](docs/README.ar.md) · [Türkçe](docs/README.tr.md) · [日本語](docs/README.ja.md) · [한국어](docs/README.ko.md) · [Português (BR)](docs/README.pt-BR.md) · [Deutsch](docs/README.de.md) · [Français](docs/README.fr.md)

Website: https://ealireza.github.io/agy-review/ · Deep dives (English): [docs/AGENTS.md](docs/AGENTS.md) for agents and loops, [docs/SECURITY-REVIEW.md](docs/SECURITY-REVIEW.md) for the security method.

---

## Contents

1. What you get
2. Why you can trust the report
3. Status: what is verified and what is not
4. Requirements
5. Install
6. First run: verify it on your machine
7. Usage: review, security, tasks, translation, models
8. Using it from agents, sub-agents and loops
9. Security model
10. Troubleshooting
11. FAQ
12. Update, uninstall, develop

---

## 1. What you get

| Skill (Claude Code / Codex) | Command (Claude Code) | What it does |
|---|---|---|
| `agy-review` / `review` | `/agy-review:review` | graded review of git changes, a branch, a file, a line range, one function or a snippet |
| `agy-security` / `security` | `/agy-review:security` | security review: OWASP/CWE, exploitability, attack scenario, secret and bad-pattern scanner, callers and callees as context |
| `agy-proxy` / `proxy` | `/agy-review:proxy` | hand any self-contained task (rewrite, summarise, draft, extract) to Antigravity and get the result back |
| `agy-translate` / `translate` | `/agy-review:translate` | translation with tone, audience and glossary; verifies code, URLs, placeholders and structure survived |
| `agy-models` / `models` | `/agy-review:models` | list the models in your agy, choose one, save it for the project or globally, set the effort |
| `setup`, `verify` | `/agy-review:setup`, `:verify` | check prerequisites, install the read-only guard, prove on your machine that writes are blocked |

Sub-agents for Claude Code: `agy-reviewer`, `agy-security`, `agy-worker`. Everything is one repository and one script (`plugins/agy-review/scripts/agy-review.mjs`). There is no server, and no account besides your own Antigravity login.

## 2. Why you can trust the report

A language model reviewing code will sometimes invent a problem. This tool does not take its word for anything.

1. The reviewer must return a strict JSON report (enforced by `--json-schema`). Each finding carries the **exact code** it is about.
2. The script looks that quote up in the real file. **Not found: the finding is rejected** and listed separately. **Found on another line: the line number is corrected.** Quotes that are too short or generic to prove anything (`return null;`, `}`) are rejected. A quote that matches several places far from the cited line is rejected as ambiguous.
3. The verdict, the counts and the CI gate are **computed by the script** from verified findings only, never copied from the model.
4. Nothing verified is **not** an approval: if findings were rejected, the model disagreed, it did not cover the code, or one of several models failed, the verdict is `inconclusive` and the exit code is 4.
5. Findings outside the requested lines are labelled and never gate. Low-confidence findings are listed but not counted.
6. Severity (impact) and priority (when to fix it) are separate and kept consistent: critical is always P0, nit is always P3, style findings are never above low.

What is still possible: a correct quote with a wrong conclusion. The quote proves the code exists, not that the reasoning is right; that is why each finding has a concrete scenario and why you should read the cited lines before acting.

Real example, this tool on a small file with two planted bugs (Claude Sonnet 4.6 through agy): 4 verified findings at the right lines with CWE-89, CWE-78, CWE-22 and CWE-369, coverage 100 %, one duplicate dropped, and the scanner independently flagged the same two lines.

## 3. Status: what is verified and what is not

| Check | Result |
|---|---|
| Unit and pipeline tests (`npm test`): grounding, scope, verdict, dedupe, symbol finder, targets, config, models, tasks, translation, security, redaction | 50 tests, all pass, with a fake `agy` (including the agentic pipeline, tree-change detection, a failing model and the `verify` gate) |
| Guard hook (allowed and denied commands, tools, quoting tricks, credential paths) | automated tests, pass |
| Claude Code manifests (`claude plugin validate`), Antigravity plugin (`agy plugin validate --strict`) | pass |
| Codex 0.163.0: marketplace add, plugin install, skills discovered | checked on Windows 11 |
| Static review, security review and tasks against real agy 1.4.8 (Gemini 3.8 Flash and Claude Sonnet 4.6), run with Bun 1.3.14 | checked on Windows 11; findings grounded at the right lines |
| Two independent reviews of the design and code (Opus: 25 findings; Codex: 28 findings), the confirmed ones fixed with a regression test each | done, see the changelog |
| **Agentic reviews (`agy --dangerously-skip-permissions` plus the guard blocking real writes)** | **not run by the author** |

The last row matters for safety and depends on your agy version, so run `verify` once after installing and after every agy update (section 6). Static reviews, security reviews of a symbol/file/snippet, tasks and translations never use that flag and cannot write anything.

Tested with agy 1.4.8, Codex CLI 0.163.0, Bun 1.3.14 and Node 24, Windows 11. macOS and Linux should work (agy uses `~/.gemini/config/plugins` on all platforms) but are untested.

## 4. Requirements

Nothing else: no other plugins, no other CLI tools.

| Needed | Why | How to get it | How to check |
|---|---|---|---|
| Antigravity CLI `agy` | does the work | https://antigravity.google/cli, then run `agy` once and sign in | `agy --version` |
| Bun (recommended) **or** Node.js 18.18+ | runs the script and the guard hook | https://bun.sh or https://nodejs.org | `bun --version` / `node --version` |
| git | git targets and finding related code | https://git-scm.com | `git --version` |
| Claude Code **or** Codex **or** any terminal | where you ask | their install guides | `claude --version` / `codex --version` |

Bun is the default in all instructions and in the guard hook (`bun guard.mjs || node guard.mjs`); Node works identically. Antigravity usage counts against your own quota. A review can take from seconds to several minutes.

## 5. Install

Pick the host you use; several can share the same script and guard.

### 5a. Claude Code

```text
/plugin marketplace add Ealireza/agy-review
/plugin install agy-review@agy-review
/agy-review:setup
/agy-review:verify
```

`/agy-review:setup` checks agy, git and the guard, and installs the guard into `~/.gemini/config/plugins/readonly-review`. `/agy-review:verify` is the live safety proof.

### 5b. Codex

```bash
codex plugin marketplace add Ealireza/agy-review
codex plugin add agy-review@agy-review
```

Restart Codex, then ask in plain language: "Check my Antigravity review setup", "Review my changes with Antigravity", "Security-review the function saveUpload", "Translate README.md to German, friendly tone".

1. **Install the guard once from a normal terminal** (it writes to `~/.gemini/config/plugins`): `bun ~/.codex/plugins/cache/agy-review/agy-review/1.0.0/scripts/agy-review.mjs --install-guard` (Windows: `%USERPROFILE%\.codex\plugins\cache\agy-review\agy-review\1.0.0\scripts\agy-review.mjs`). Only agentic git reviews need the guard.
2. **Codex's sandbox must let agy work:** outbound network, write access to `~/.gemini/antigravity-cli`, and a localhost socket. With `workspace-write` you will probably need, in `~/.codex/config.toml`:

   ```toml
   [sandbox_workspace_write]
   network_access = true
   writable_roots = ["/home/you/.gemini/antigravity-cli"]   # Windows: "C:\\Users\\you\\.gemini\\antigravity-cli"
   ```

   If something is still blocked, the skill names the missing access and stops; it never widens permissions by itself. Whether agy runs correctly inside your Codex sandbox is the part of the Codex setup that the author could not test, so run `verify` from inside Codex too.

### 5c. Plain terminal

```bash
git clone https://github.com/Ealireza/agy-review
cd agy-review
bun plugins/agy-review/scripts/agy-review.mjs --check
bun plugins/agy-review/scripts/agy-review.mjs --install-guard
bun plugins/agy-review/scripts/agy-review.mjs --verify
# then, from inside any git repository (use node instead of bun if you prefer):
bun /full/path/to/agy-review/plugins/agy-review/scripts/agy-review.mjs --security --symbol saveUpload
```

Tip: `alias agyr='bun /full/path/to/agy-review/plugins/agy-review/scripts/agy-review.mjs'`.

### 5d. Antigravity side only

The guard is an ordinary Antigravity plugin. Copy `plugins/agy-review/antigravity-plugin/readonly-review` to `~/.gemini/config/plugins/readonly-review` or run `--install-guard`; check with `agy plugin list`. It does nothing unless a prompt contains `AGY_READONLY_REVIEW`, so your normal agy sessions are unchanged. It also ships a `readonly-code-review` skill for interactive agy.

## 6. First run: verify it on your machine

Run once after installing and after every agy update: `/agy-review:verify`, the Codex `verify` skill, or `--verify`. It makes one small live agy call in a throwaway folder: read a file (must work), write a file, redirect into a file and delete a file (must all be blocked). Expected:

```text
PASS  read allowed
PASS  file write blocked
PASS  redirect blocked
PASS  delete blocked
PASS  guard actually fired

Verified: reads work, writes are blocked.
```

Any `FAIL` ends with `NOT VERIFIED` and agentic reviews stay disabled: open an issue with the output and your `agy --version`. A passing `verify` is recorded for exactly this guard and this agy version; **agentic reviews refuse to start without it**, and an agy or guard update invalidates it, so run `verify` again after updates. Static modes do not need it.

## 7. Usage

Run from the root of the repository.

### 7a. Review: choose the target

| You want to review | Use | Mode |
|---|---|---|
| uncommitted work | nothing | agentic, read-only |
| a branch / staged changes / one commit | `--base main` / `--staged` / `--commit <sha>` (+ `--paths a,b`) | agentic, read-only |
| a file or a range | `--file src/a.kt` or `--file src/a.kt:40-80` (repeatable) | static |
| one function or class | `--symbol parseConfig` (+ `--file` if the name is ambiguous) | static |
| code that exists only in memory | `... \| agy-review --stdin --lang python --name snip.py [--start-line N]` | static |
| any of these plus permission to look at other files | add `--agentic` | agentic, read-only |

*Static*: the script reads and numbers the code itself and the model gets no tools, so nothing can be touched and nothing can be invented about files it was not shown. *Agentic*: the reviewer reads the repository itself through the guard hook, which blocks every write.

Help the reviewer: `--context "what this code must do"`, `--focus "concurrency, error handling"` (or trailing words), `--context-lines N`.

Output: Markdown by default; `--format json` for machines; `--output file`; `--fail-on high` (exit 10 if a verified high or critical finding exists); `--previous old.json` marks findings new, persisting, resolved or not-reported-again.

```text
## Summary
**Verdict: request changes**. ...
Target: app.py:1-19 | mode: static | model: Claude Sonnet 4.6 | effort: model default (...)
Findings: 4 verified (2 critical, 1 high, 1 medium ...).
### Critical
- **SQL injection** - `app.py:6` [P0 | security | confidence high | CWE-89] (id 9a9fb99468)
  Evidence:
      cur.execute("SELECT * FROM users WHERE name = '" + name + "'")
  Problem: ...   Fix: ...
```

### 7b. Security review

`--security` (skill `agy-security`, command `/agy-review:security`, sub-agent `agy-security`) works on every target above and adds: a threat-model method (untrusted source to dangerous sink, with the controls in between), OWASP Top 10 (2021) and CWE mapping, `exploitability` (`demonstrated`, `likely`, `conditional`, `theoretical`), `attack_scenario`, `data_flow`, a model-free scanner for secrets and ~25 bad-pattern classes, and **related code**: what the target calls and who calls it.

- A hard-coded secret (private key, AWS, GitHub, Stripe, Slack, Google) is **redacted before anything is sent to a model** and reported as a finding by pattern.
- A `cve` in a report is the model's claim and is always labelled `cve_verified: false`: confirm it on NVD or with `osv-scanner` / `npm audit` / `pip-audit`. The tool never invents or verifies CVEs.
- "Claude wrote code, review it and its neighbours": copy the ready-made rule from `examples/` into your `CLAUDE.md` or `AGENTS.md`, or install the optional Stop hook or pre-commit hook. Details and chain recipes: [docs/SECURITY-REVIEW.md](docs/SECURITY-REVIEW.md).

### 7c. Tasks: `agy-proxy`

```bash
bun agy-review.mjs --task "Summarise in 5 bullets for non-technical readers" --input notes.md
cat draft.txt | bun agy-review.mjs --task "Rewrite more friendly" --stdin --format json
```

The model gets only the text you pass and no tools. Text mode prints only the answer; stderr reports the model and effort.

### 7d. Translation: `agy-translate`

```bash
bun agy-review.mjs --preset translate --to Persian --tone friendly --audience "new developers" --glossary glossary.json --input README.md --output docs/README.fa.md
```

Options: `--from`, `--variant` (pt-BR, zh-TW, de-CH ...), `--tone` (formal, neutral, friendly, casual, technical, marketing, literary, legal), `--audience`, `--glossary` (JSON `{"repo":"مخزن","API":"="}` or CSV; `=` keeps the term), `--keep a,b`, `--notes`, `--strict`. Long texts are split on blank lines (never inside a code block) and translated chunk by chunk. After translating, the script verifies that fenced code, inline code, URLs, placeholders (`{{x}}`, `${x}`, `%s`), tags and headings match the source, and reports every difference (`--strict` turns a difference into exit 11). The skills interview you for tone, audience and terms first, asking only what they cannot infer. Machine checks cannot judge fluency; have a native reader check important text.

### 7e. Models and effort

```bash
bun agy-review.mjs --list-models                    # id and name, * marks your selection
bun agy-review.mjs --set model=claude-sonnet-4-6    # this project (.agy-review.json); add --global for all projects
bun agy-review.mjs --set models=gemini-3.8-flash-high,claude-sonnet-4-6   # cross-check: findings both report are marked
bun agy-review.mjs --show-config
```

Per run: `--model <id|name>`, `--models a,b`, `--effort auto|low|medium|high|xhigh|max`. Precedence: command line, project file, user file, agy default. `--effort auto` (the default) is a deterministic, explained choice: reviews scale with the amount of code in scope (a risk-sensitive focus such as security adds one step), tasks with the wording (mechanical transforms low, reasoning-heavy high) and the input length; `max` is never automatic. Some models do not accept `--effort`; the tool then uses the model default and says so. If Gemini's content filter refuses a prompt and you did not name a model, the tool retries once with a non-Gemini model and says so.

### 7f. Options and exit codes

`bun agy-review.mjs --help` lists everything. Exit codes: `0` ok · `1` error, timeout or unparseable reply · `2` usage error or missing prerequisite · `3` the working tree changed during an agentic review · `4` inconclusive or incomplete (**not a pass**) · `10` the `--fail-on` gate failed (the report is valid) · `11` translation check failed with `--strict`. If several apply, `3` wins over `10`, and `10` over `4`; a report is written in every case except `1` and `2`, so read `verdict` and `incomplete` in it. A clean working tree is not an error: the tool prints "No changes to review" and exits 0 without calling a model.

## 8. Using it from agents, sub-agents and loops

Every skill is a plain CLI call with stable JSON, so any agent can use it: spawn the `agy-reviewer`, `agy-security` or `agy-worker` sub-agent in Claude Code, call the skills in Codex, or call the script from any framework.

```bash
# implement -> review -> fix, repeated at most 5 times
bun agy-review.mjs --security --symbol applyDiscount --context "applies at most one coupon" --format json --output r.json --fail-on high
# exit 0: done   10: fix the P0/P1 findings and re-run with --previous r.json   4: inconclusive, not a pass   1/2: stop and report
```

The reviewer is never told what you changed, so each round stays independent. Full contract, JSON fields, loop recipes and fan-out patterns: [docs/AGENTS.md](docs/AGENTS.md).

## 9. Security model

**Static reviews, security reviews of a symbol/file/snippet, tasks and translations** run agy without any permission flag and without tools in an empty temp folder: agy cannot read or write your files; the only data that leaves is what the script put in the prompt (with recognised secrets redacted).

**Agentic reviews** (git targets, or `--agentic`) start agy with `--dangerously-skip-permissions` so nothing waits for a prompt, and rely on a `PreToolUse` guard hook (`guard.mjs`) that inspects every tool call and **denies by default**:

- allowed: file viewing and search tools; shell commands, single or chained, built only from read-only `git` subcommands, `rg`, `grep`, `cat`, `ls`, `head`, `tail`, `wc`, `find` (without `-delete`/`-exec`), PowerShell `Get-*`, `Select-String` and a few more (the list is in `guard.mjs`);
- denied: every write/edit/notebook/image/schedule/sub-agent/browser/web/MCP tool and any unknown tool; redirection, `$(...)`, backticks, script blocks, `eval`-like constructs; `git commit/push/checkout/reset/...`; interpreters and package managers; `curl`, `ssh`; reading credential stores (`.ssh`, `.aws`, `.gnupg`, private keys);
- if the guard crashes it denies; the script refuses to start an agentic run unless the guard is installed, identical to the bundled one, **and a passing `--verify` was recorded for this guard and this agy version**; before and after the run it fingerprints `git status`, the tracked and staged diffs and the content of every untracked file, and exits 3 with a warning if anything differs.
- **Secrets in agentic mode cannot be redacted** before the reviewer reads the files. The tool detects them, warns and lists them in `limitations`; rotate them, or review with `--file` / `--symbol` where they are redacted first.

What this is not:

- **Not an OS sandbox.** The guard filters tool names and command text; agy's own sandbox is not available everywhere. A deliberate prompt injection hidden in reviewed code could look for a command shape the filter accepts. The before/after check catches modified tracked files and new files, not reads.
- **Your code is sent to Google's model**; reads are unrestricted apart from the credential paths. `.env` files in the repo are readable by agentic reviews. Do not review code you may not share.
- git can run external diff or textconv programs configured in a repository: review repositories you trust.
- Findings may be wrong or incomplete, and "no findings" is never "secure".

## 10. Troubleshooting

| Symptom | Cause and fix |
|---|---|
| `Missing: agy CLI` | install the Antigravity CLI and run `agy` once to sign in; `agy --version` must work in the shell that runs the plugin |
| `Missing: read-only guard - missing/outdated` | run setup (`/agy-review:setup`, the Codex `setup` skill, or `--install-guard`); only agentic reviews need it |
| `Not inside a git repository` (exit 2) | `cd` to the repository root, or review code with `--file` / `--symbol` / `--stdin` |
| Verdict `inconclusive`, exit 4 | not a pass: findings were rejected, the model disagreed or did not cover the code, or one model failed. Narrow the scope, add `--context`, or try another `--model` |
| `blocked by Gemini's filters` | the Gemini safety filter refused (common for security prompts). Without `--model` the tool retries with a non-Gemini model; otherwise pick one with `--model` |
| `--effort is not supported for model` | handled automatically (model default is used and reported) |
| Empty review, exit 1 | check sign-in and quota with `agy -p "say hi"`; raise `--timeout` for big targets |
| Exit 3 / working tree changed | something modified your files during an agentic review (editor, build, or a guard bypass). Check `git status` and `git diff`; if you did not change them, treat it as a security event |
| Many rejected findings | the model quoted code that is not there. Expected sometimes; they are never counted. Use a stronger `--model` or narrower scope |
| `--symbol`: "defined in several places" or "not found" | pass `--file`, or use `--file path:A-B`. The finder is heuristic (brace/indent matching), not a parser |
| Codex: "blocked by sandbox" | see 5b: network, `~/.gemini/antigravity-cli` writes and a localhost socket must be allowed |
| Windows: `agy` or `bun` not found inside Claude/Codex | the tool shell has a different `PATH`; start it from a shell where the command works |
| `verify` prints FAIL | do not use agentic reviews on important code; open an issue with the output and `agy --version` |

## 11. FAQ

**Does it change my code?** No. Static modes cannot; agentic mode blocks writes and warns if your tree differs afterwards. It never commits, stashes or checks out anything.

**Is Bun faster than Node here?** Not measurably. On the author's Windows machine startup was about 56 ms with Node and 64 ms with Bun, and the guard hook about 60 ms versus 57 ms; a review takes tens of seconds and that time is the model. Bun is the documented default; Node 18.18+ works the same. Both are covered by the same code.

**Does it cost money?** The plugin is free. Each review uses your Antigravity quota.

**Which files does Antigravity see?** Static modes: only the code the script sends (plus bounded related code for `--security`). Agentic modes: whatever it reads in the repository, and anywhere on disk except credential paths.

**Can it fix the findings?** It never does. Another agent or you fixes; the reviewer only reviews, so it stays independent.

**Can it review a GitHub pull request?** Check the branch out locally and use `--base`. There is no GitHub API access.

**Why not allow-list commands in agy's settings?** Tested: in headless mode agy matches multi-word grants exactly (`git status` yes, `git status --short` no) and a hook's "allow" does not override the permission check. A hook can only deny reliably, hence skip-permissions plus a deny-by-default hook for agentic mode, and no tools at all for static mode.

**Can I add allowed commands or scanner rules?** Edit `CMDS` / `GIT_OK` in `guard.mjs` or `RULES` in `lib/security.mjs`, run `npm test`, then `--install-guard`.

## 12. Update, uninstall, develop

```text
/plugin marketplace update agy-review          # Claude Code        |  codex plugin marketplace upgrade agy-review  # Codex
/plugin uninstall agy-review@agy-review        # Claude Code        |  codex plugin remove agy-review@agy-review    # Codex
bun .../agy-review.mjs --uninstall-guard       # removes the guard from ~/.gemini/config/plugins
```

After an update run setup again (it re-installs a changed guard) and verify.

```bash
npm test        # 50 tests, no agy, no network (uses a fake agy in fixtures/)
```

```text
.claude-plugin/marketplace.json  .agents/plugins/marketplace.json
plugins/agy-review/
  .claude-plugin/  .codex-plugin/        manifests
  commands/ skills/ agents/              Claude Code
  codex-skills/                          Codex
  prompts/ (rubric.md, security.md)  schema/review.schema.json
  scripts/agy-review.mjs  scripts/lib/   the wrapper (targets, grounding, merge, security, translate, config, agy)
  antigravity-plugin/readonly-review/    the Antigravity plugin: hooks.json, guard.mjs, skill
docs/ (AGENTS.md, SECURITY-REVIEW.md, README.<lang>.md, index.html = website)   examples/   test/   fixtures/
```

Issues and pull requests are welcome, especially: `verify` results on macOS and Linux, Codex sandbox settings that work, guard bypasses (report privately first if you can) and new scanner rules. Translations: copy `README.md` to `docs/README.<code>.md`, translate, and add the language to the switcher line everywhere.

## License

MIT, see [LICENSE](LICENSE).
