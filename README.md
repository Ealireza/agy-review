# agy-review

**An independent reviewer that has to show its work.** Code review, security review, task delegation and translation by Google Antigravity (`agy`), from Claude Code, Codex or any terminal. Read-only, no permission prompts, and every finding is checked against your real code before you see it.

> ## NEW: stop paying Claude and Codex tokens to refresh your graphify graph
>
> **graphify updates now run on Antigravity, in the background, on every commit, merge, checkout and rebase. Your agent spends 0 tokens on them and you need no API key.**
>
> One command, `agy-review --graphify setup`, re-registers graphify's git hooks so that **the expensive part of every graph update (reading your docs and naming communities with a language model) is done by a cheap Antigravity model instead of your Opus or Fable session.** `git commit` returns in a fraction of a second and the graph catches up by itself.
>
> In a real run on Windows, a commit that changed code and a doc updated the graph in **22 seconds with a single Antigravity call and 0 Claude or Codex tokens.** The model behind it can only read text and answer text: it has no tools and no write or exec rights. Details and setup: section 7g.

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
7. Usage: review, security, tasks, translation, models, graphify
8. Using it from agents, sub-agents and loops
9. Security model
10. Troubleshooting
11. FAQ
12. Update (how to get a new version), uninstall, develop

---

## 1. What you get

| Skill (Claude Code / Codex) | Command (Claude Code) | What it does |
|---|---|---|
| `agy-review` / `review` | `/agy-review:review` | graded review of git changes, a branch, a file, a line range, one function or a snippet |
| `agy-security` / `security` | `/agy-review:security` | security review: OWASP/CWE, exploitability, attack scenario, secret and bad-pattern scanner, callers and callees as context |
| `agy-proxy` / `proxy` | `/agy-review:proxy` | hand any self-contained task (rewrite, summarise, draft, extract) to Antigravity and get the result back |
| `agy-translate` / `translate` | `/agy-review:translate` | translation with tone, audience and glossary; verifies code, URLs, placeholders and structure survived |
| `agy-models` / `models` | `/agy-review:models` | list the models in your agy and the `--effort` each one accepts, choose one, save it for the project or globally |
| `agy-graphify` / `graphify` | `/agy-review:graphify` | **keep a graphify graph fresh on Antigravity through git hooks: 0 Claude or Codex tokens, no API key** |
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
| Unit and pipeline tests (`npm test`): grounding, scope, verdict, dedupe, symbol finder, targets, config, models, tasks, translation, security, redaction | 73 tests, all pass, with a fake `agy` (including the agentic pipeline, tree-change detection, a failing model and the `verify` gate) |
| Guard hook (allowed and denied commands, tools, quoting tricks, credential paths) | automated tests, pass |
| Claude Code manifests (`claude plugin validate`), Antigravity plugin (`agy plugin validate --strict`) | pass |
| Codex 0.163.0: marketplace add, plugin install, skills discovered | checked on Windows 11 |
| Static review, security review and tasks against real agy 1.4.8 (Gemini 3.8 Flash and Claude Sonnet 4.6), run with Bun 1.3.14 | checked on Windows 11; findings grounded at the right lines |
| `--effort` per model: the default model (low, medium, high), models with the effort in their name, and Claude models without `--effort` | checked against real agy 1.4.8 |
| graphify on Antigravity, end to end: real graphify 0.9.86 plus real agy 1.4.8 on Windows. A git hook updated the graph in the background (22 s, 1 Antigravity call, `git commit` returned in 0.3 s) and only the changed document was sent to the model | checked by hand, and by tests with a fake graphify and a fake agy |
| Two independent reviews of the design and code (Opus: 25 findings; Codex: 28 findings), the confirmed ones fixed with a regression test each | done, see the changelog |
| **Agentic reviews (`agy --dangerously-skip-permissions` plus the guard blocking real writes)** | **not run by the author** |

Not tested by the author: `--graphify setup --yes` on a real `uv tool` install of graphify (the hand test used graphify from pip, which already had the `openai` package). The agentic row matters for safety and depends on your agy version, so run `verify` once after installing and after every agy update (section 6). Static reviews, security reviews of a symbol/file/snippet, tasks and translations never use that flag and cannot write anything.

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

1. **Install the guard once from a normal terminal** (it writes to `~/.gemini/config/plugins`): `bun ~/.codex/plugins/cache/agy-review/agy-review/1.0.1/scripts/agy-review.mjs --install-guard` (Windows: `%USERPROFILE%\.codex\plugins\cache\agy-review\agy-review\1.0.1\scripts\agy-review.mjs`; the folder name is the installed version, so after an update use the folder that exists). Only agentic git reviews need the guard.
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

Per run: `--model <id|name>`, `--models a,b`, `--effort auto|low|medium|high|xhigh|max`. Precedence: command line, project file, user file, agy default. `--effort auto` (the default) is a deterministic, explained choice: reviews scale with the amount of code in scope (a risk-sensitive focus such as security adds one step), tasks with the wording (mechanical transforms low, reasoning-heavy high) and the input length; `max` is never automatic. **The effort is always matched to the model, never guessed.** Every model has its own idea of `--effort`: agy's default model offers `low | medium | high`, the models with the effort in their name (`gemini-3.8-flash-high`, `gpt-oss-120b-medium`) accept no `--effort` at all, and the Claude models do not support it. The tool asks agy which case a model is (a short check that is stopped as soon as agy answers), remembers the answer per model and agy version in `~/.agy-review-cache.json`, brings your effort to the nearest value the model accepts (for example `xhigh` becomes `high`) and the report says what was really used. If agy's list changes, the error is read, the cache corrected and the run retried once. `--list-models` shows what each model accepts (`--refresh` asks again). If Gemini's content filter refuses a prompt and you did not name a model, the tool retries once with a non-Gemini model and says so.

### 7f. Options and exit codes

`bun agy-review.mjs --help` lists everything. Exit codes: `0` ok · `1` error, timeout or unparseable reply · `2` usage error or missing prerequisite · `3` the working tree changed during an agentic review · `4` inconclusive or incomplete (**not a pass**) · `10` the `--fail-on` gate failed (the report is valid) · `11` translation check failed with `--strict`. If several apply, `3` wins over `10`, and `10` over `4`; a report is written in every case except `1` and `2`, so read `verdict` and `incomplete` in it. A clean working tree is not an error: the tool prints "No changes to review" and exits 0 without calling a model.

### 7g. graphify on Antigravity: zero agent tokens for graph updates

**If you use [graphify](https://github.com/Graphify-Labs/graphify), this is the biggest saving in the whole project.** graphify turns a repository and its docs into a knowledge graph. Most of its work is deterministic code (tree-sitter, clustering, report, cache, merge) and costs nothing. Two steps need a language model: **semantic extraction of docs and papers**, and **naming communities**. If you do not pin a backend, graphify picks one by itself, and inside a coding agent that is the coding agent (or its subscription). So every refresh of the graph that touches a doc is paid for with your Opus, Fable or Codex tokens.

**`--graphify` moves exactly those two steps to Antigravity and leaves everything else alone.** The script starts a small local server on `127.0.0.1` that speaks the OpenAI-compatible protocol and answers with `agy`, then **pins every LLM step of graphify to it**, so graphify can never fall back to your coding agent or to a paid API key. You do not need Ollama or any key. (graphify calls that slot "ollama" in its settings: it only means "any local OpenAI-compatible server".)

```text
git commit / merge / checkout / rebase
   -> hook returns at once and starts the update in the background
      -> graphify extract: code is parsed locally, only changed docs go to the model
      -> the model is Antigravity (agy), reached through the local server
      -> graphify cluster-only: communities are named by Antigravity, report refreshed
   -> Claude / Codex tokens used: 0.  API keys needed: 0.
```

**Why no write or exec rights are needed.** You might expect this to need Python and file writes, but the model only has to read text and answer text. graphify itself writes `graphify-out/`; this tool writes the hooks, a lock file and a log. The model behind the server runs without the permission flag, so agy denies tool calls (agy's own permission model, not an OS sandbox), and a prompt injection hidden in a document should not be able to make it do anything. Recognised secrets in your docs are redacted before they are sent. This keeps the read-only promise of the rest of the project.

Set it up once per repository:

```bash
bun agy-review.mjs --graphify doctor              # graphify, agy, and graphify's own Python must be able to import openai
bun agy-review.mjs --graphify setup --yes         # installs the git hooks; --yes lets it add the openai package to graphify's environment
bun agy-review.mjs --graphify update --full       # only if there is no graph yet: the first build reads every doc, so it takes a while
bun agy-review.mjs --graphify status              # hooks, last update, tokens used on Antigravity
```

In Claude Code or Codex just ask: "set up graphify updates on Antigravity" (skill `agy-graphify` / `graphify`, command `/agy-review:graphify`). The skill asks before it adds a package to graphify's environment.

What it does for you:

- **Hooks:** `post-commit`, `post-merge`, `post-checkout` (branch switches only) and `post-rewrite` (amend, rebase) run the update **detached**, so the git command returns in a fraction of a second. Existing content of those hook files is kept. By default **graphify's own hooks are replaced** (they rebuild code only, and ours do that and more; two writers on one graph would race). `--keep-graphify-hook` keeps both; `--graphify hook-uninstall --restore-graphify` puts graphify's own back. A copy of this tool under `~/.agy-review/runtime` makes the hooks survive plugin updates. Skip once with `AGY_GRAPHIFY_SKIP=1 git commit ...`.
- **Incremental:** graphify's own cache decides what changed; unchanged documents are never sent to the model. Two commits in a row never run two updates at once: the second asks for one more round.
- **Your agent stops burning tokens on it:** if `CLAUDE.md` or `AGENTS.md` has a graphify section that tells the agent to rebuild the graph, `--graphify rules --write-rules` appends a short rule that tells it not to (your own text is never edited, and nothing is created if the files do not exist).
- **Cheap by default:** effort `low`, because extraction is structured work. In a test, `low` used about 40 times fewer output tokens than `high` for the same document (685 against 29,996) and finished in 15 seconds instead of 207. Change it with `--set graphifyEffort=...`, pick the model with `--set graphifyModel=<id>` (see `--list-models`), use `--set graphifyConcurrency=N` for parallel calls and `--set graphifyLabels=false` to skip community naming.

Honest limits: updates use your **Antigravity quota** (that is the point: a cheap model instead of an expensive one, not "free"). **Images are not extracted** on this path (graphify skips them for this backend, and agy cannot see them through it). Code is parsed locally; docs and papers are text sent to Google's model. The quality of docs extraction depends on the model you choose. graphify must be installed (`uv tool install graphifyy`), and its own Python needs the `openai` package: `--graphify setup --yes` adds it with `uv tool install --force "graphifyy[openai]"` (or `pipx inject graphifyy openai`). Details, settings and troubleshooting: [docs/GRAPHIFY.md](docs/GRAPHIFY.md).

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

**graphify updates** (`--graphify`) give the model no tools at all: it receives text through a server that listens on `127.0.0.1` only, requires a random bearer key that exists only for the life of one update, rejects foreign `Host` headers, and runs `agy` in an empty temp folder without any permission flag. The things written to disk are written by graphify (`graphify-out/`) and by this tool (git hooks, `~/.agy-review/runtime`, a lock and a log). The hooks run code on every commit: that is the same trust you already give graphify's own hooks, and `--graphify hook-uninstall` removes them.

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
| `invalid model selection ... has no "xhigh" effort (available: low, medium, high)` or `conflicts with --effort` or `--effort is not supported` | fixed in 1.0.1: the effort is matched to the model automatically and the report says what was used. If you still see it, run `--list-models --refresh`, update the plugin (section 12) and report it |
| graphify: `openai package ... missing` | graphify's own Python lacks the `openai` package. Run `--graphify setup --yes`, or `uv tool install --force "graphifyy[openai]"` (pipx: `pipx inject graphifyy openai`) |
| graphify: the graph did not update after a commit | `--graphify status` shows the hooks and the last result; read `graphify-out/.agy-update.log`; run `--graphify update --debug` once in the foreground (it keeps each request and reply in `graphify-out/.agy-debug/`, which contain your docs). No graph yet means the hook does nothing: build it once with `--graphify update --full` |
| graphify: `agy returned no answer` for a chunk | graphify retries that chunk on the next update. Check sign-in and quota with `agy -p "say hi"`, or choose another model with `--set graphifyModel=<id>` |
| graphify warns that the skill and the package versions differ | harmless for this tool; upgrade graphify with `uv tool upgrade graphifyy` |
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

**Does it cost money?** The plugin is free. Each review, task, translation and graphify update uses your Antigravity quota.

**Do I need Ollama or an API key for graphify?** No. graphify has a backend slot named "ollama" that means "any local OpenAI-compatible server"; the server behind it is this tool's small Antigravity server. The only thing to install is graphify's `openai` Python package, which `--graphify setup --yes` adds.

**Will graphify still spend my Claude or Codex tokens?** Only if you or your agent run `/graphify --update`, `graphify extract` or similar yourself, or if a `CLAUDE.md` / `AGENTS.md` section tells the agent to rebuild the graph. Use `--graphify rules --write-rules` to add the rule that stops that.

**Which files does Antigravity see?** Static modes: only the code the script sends (plus bounded related code for `--security`). Agentic modes: whatever it reads in the repository, and anywhere on disk except credential paths.

**Can it fix the findings?** It never does. Another agent or you fixes; the reviewer only reviews, so it stays independent.

**Can it review a GitHub pull request?** Check the branch out locally and use `--base`. There is no GitHub API access.

**Why not allow-list commands in agy's settings?** Tested: in headless mode agy matches multi-word grants exactly (`git status` yes, `git status --short` no) and a hook's "allow" does not override the permission check. A hook can only deny reliably, hence skip-permissions plus a deny-by-default hook for agentic mode, and no tools at all for static mode.

**Can I add allowed commands or scanner rules?** Edit `CMDS` / `GIT_OK` in `guard.mjs` or `RULES` in `lib/security.mjs`, run `npm test`, then `--install-guard`.

## 12. Update, uninstall, develop

### How to update to a new version

A new release does not reach you by itself: you update on purpose. Four steps.

**1. Check what you have and whether something newer exists**

```bash
bun agy-review.mjs --version          # for example: agy-review 1.0.1 (bun 1.3.14)
bun agy-review.mjs --update-check     # asks GitHub; prints the exact commands below if a newer version exists
```

You can also read the release list at https://github.com/Ealireza/agy-review/releases and the [changelog](CHANGELOG.md).

**2. Update the plugin for the host you use**

| Host | Commands (run in a normal terminal) | Then |
|---|---|---|
| Claude Code | `claude plugin marketplace update agy-review` and then `claude plugin update agy-review@agy-review` | restart Claude Code |
| Codex | `codex plugin marketplace upgrade agy-review` and then `codex plugin remove agy-review@agy-review` and `codex plugin add agy-review@agy-review` | restart Codex |
| Plain clone | `git pull` in your clone | nothing |

**3. Refresh the parts that live outside the plugin folder**

```bash
bun agy-review.mjs --install-guard         # the Antigravity guard hook is copied to ~/.gemini/config/plugins; this replaces it with the new one
bun agy-review.mjs --verify                # a guard or agy change invalidates the last check, and agentic reviews stay off until this passes
bun agy-review.mjs --graphify setup        # only if you use graphify: refreshes the hooks and the runtime copy in ~/.agy-review/runtime
```

**4. Make sure it worked:** `--version` shows the new number, `--check` says OK for everything, and `--list-models --refresh` re-reads what each model accepts for `--effort`.

If something breaks after an update: run `--check`, read the troubleshooting table (section 10), and if you need the old version back, remove the plugin and install a specific release with `git clone --branch v1.0.0 https://github.com/Ealireza/agy-review`. Your settings (`.agy-review.json`) are plain files that updates never touch.

### Uninstall

```text
claude plugin uninstall agy-review@agy-review   # Claude Code
codex plugin remove agy-review@agy-review       # Codex
bun agy-review.mjs --uninstall-guard            # removes the guard from ~/.gemini/config/plugins
bun agy-review.mjs --graphify hook-uninstall --restore-graphify   # removes our git hooks and puts graphify's own back
```

Delete `~/.agy-review` (runtime copy) and `~/.agy-review-cache.json` (effort cache) if you want nothing left behind.

### Develop

```bash
npm test        # 73 tests, no agy, no network (uses a fake agy in fixtures/)
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
  scripts/lib/graphify.mjs, shim.mjs     graphify hooks and update; the local Antigravity server
docs/ (AGENTS.md, SECURITY-REVIEW.md, GRAPHIFY.md, README.<lang>.md, index.html = website)   examples/   test/   fixtures/
```

Issues and pull requests are welcome, especially: `verify` results on macOS and Linux, Codex sandbox settings that work, guard bypasses (report privately first if you can) and new scanner rules. Translations: copy `README.md` to `docs/README.<code>.md`, translate, and add the language to the switcher line everywhere.

## License

MIT, see [LICENSE](LICENSE).
