# graphify on Antigravity

**Keep your [graphify](https://github.com/Graphify-Labs/graphify) knowledge graph fresh with a cheap Antigravity model instead of your Claude or Codex session. 0 agent tokens, no API key, no Ollama.**

```text
git commit / merge / checkout / rebase
   -> a git hook returns at once and starts the update in the background
      -> graphify extract: code parsed locally (tree-sitter); only changed docs are sent to a model
      -> the model is Antigravity (agy), reached through a local OpenAI-compatible server
      -> graphify cluster-only: communities named by Antigravity, report and graph refreshed
   -> Claude / Codex tokens used: 0
```

## 1. The problem

graphify is mostly deterministic code, and that part is free. Only two steps need a language model:

| Step | What it does | Costs tokens? |
|---|---|---|
| AST extraction of code (tree-sitter), clustering, report, cache, merge | builds the graph from code | no, local |
| **Semantic extraction of docs, papers (text)** | reads each changed document and produces nodes and edges | **yes** |
| **Naming communities** | gives each cluster a readable name | **yes** |

If you do not pin a backend, graphify chooses one by itself. Inside a coding agent with no API key set, that choice is the coding agent: the `/graphify` skill dispatches sub-agents on your session, or graphify uses the `claude` binary and your subscription. A `CLAUDE.md` section written by `graphify claude install` even tells the agent to rebuild the graph after code changes. Every one of those refreshes is paid for with Opus, Fable or Codex tokens.

graphify's own `hook install` hooks do **not** use a model: they rebuild code only and ignore docs (docs wait for the next `/graphify --update`, which is where the tokens go).

## 2. The solution

`agy-review --graphify` does not reimplement graphify. graphify can talk to any OpenAI-compatible server, so this tool:

1. starts a small server on `127.0.0.1` (random port, random bearer key that lives for one update) that answers chat requests with `agy`;
2. runs graphify's own commands (`graphify extract`, `graphify cluster-only`) with the backend **pinned** to that server, both through environment variables and through flags, so there is no path back to your agent or to a paid key;
3. wraps that in git hooks that run detached, in a lock, with a log.

graphify keeps doing everything it is good at: incremental detection (its cache and manifest), chunking, prompts, validation, merge, clustering, report, HTML. Upgrading graphify does not break this tool because only its public CLI is used.

## 3. Why the model needs no write or exec rights

It is natural to expect that moving the update to another model means giving it file writes and Python. It does not:

- the model receives text and returns text (graphify's extraction JSON);
- graphify itself writes `graphify-out/` and runs its own Python;
- this tool writes only hooks, a lock, a log and a status file.

The model runs through `agy` in an empty temporary folder, with no permission flag and no tools. Without the permission flag agy denies tool calls in headless mode, so a prompt injection inside a document should not be able to read, write or run anything. That is agy's own permission model, not an OS sandbox, and an injected tool attempt only makes that chunk fail. Recognised secrets (private keys, AWS, GitHub, GitLab, Stripe, Slack, Google tokens) and plain `password=`, `api_key=` and `_authToken=` assignments are redacted from everything that is sent; other secret formats are not. The local server accepts loopback connections only, checks a bearer key and the `Host` header, caps request size and serves two routes.

## 4. Install and set up

Requirements: `agy` (signed in), graphify (`uv tool install graphifyy` or `pipx install graphifyy`), git, Bun or Node 18.18+. graphify's own Python needs the `openai` package (it is the client graphify uses to talk to the local server).

```bash
bun agy-review.mjs --graphify doctor      # shows what is missing, with the exact fix command
bun agy-review.mjs --graphify setup --yes # --yes = allow adding the openai package to graphify's environment
bun agy-review.mjs --graphify update --full   # only if no graph exists yet
bun agy-review.mjs --graphify status
```

`--yes` runs `uv tool install --force "graphifyy[openai]"` (or `pipx inject graphifyy openai`). It changes graphify's environment, so it is never done without that flag. In Claude Code and Codex, the skills (`agy-graphify` / `graphify`) ask you first.

## 5. What gets installed

| Where | What |
|---|---|
| `.git/hooks/post-commit`, `post-merge`, `post-checkout`, `post-rewrite` | a marked block (`# agy-graphify-hook-start ... end`); existing hook content is kept; installing twice does not duplicate it |
| `~/.agy-review/runtime/` | a self-contained copy of this tool, so the hooks keep working when the plugin updates or moves |
| `.git/info/exclude` | lines that keep `graphify-out/.agy-update.*` out of `git status` (local to your clone) |
| `graphify-out/.agy-update.log`, `.agy-update.json`, `.agy-update.lock` | log, last result, lock |

Hook details: `post-checkout` acts only on branch switches (`$3 = 1`). The hook starts `--graphify update --detach --quiet` and returns immediately. It does nothing when there is no graph yet. Skip once with `AGY_GRAPHIFY_SKIP=1 git commit ...` (graphify's own `GRAPHIFY_SKIP_HOOK=1` works too).

**graphify's own hooks are replaced by default** (`graphify hook uninstall` is run first): they rebuild code only, ours do that and more, and two writers on one graph would race. Keep both with `--keep-graphify-hook`. Put graphify's back with `--graphify hook-uninstall --restore-graphify`.

## 6. Stop your agent from rebuilding the graph itself

If `CLAUDE.md` or `AGENTS.md` contains a graphify section that tells the agent to rebuild the graph after code changes, the agent keeps spending tokens. `--graphify rules` prints a short rule; `--graphify rules --write-rules` appends it to the existing `CLAUDE.md` / `AGENTS.md` (your text is never edited; nothing is created if the files do not exist). The rule tells the agent not to run `/graphify --update` or `graphify extract`, and to call `--graphify update --detach --quiet` if the graph looks stale.

## 7. Commands

| Command | What it does |
|---|---|
| `--graphify doctor` | checks graphify, agy, the `openai` package in graphify's Python, and whether a graph exists |
| `--graphify setup [--yes] [--write-rules] [--keep-graphify-hook]` | doctor, then installs hooks and the runtime copy |
| `--graphify update [--full] [--detach] [--quiet] [--debug]` | runs an update now. `--full` forces a complete re-extraction. `--detach` returns at once. `--debug` keeps each request and reply under `graphify-out/.agy-debug/` (they contain your documents) |
| `--graphify status` | hooks, last result (time, calls, tokens), agent rules |
| `--graphify hook-install` / `hook-uninstall [--restore-graphify]` | the hooks alone |
| `--graphify rules [--write-rules]` | the agent rule |
| `--graphify serve` | runs the local server in the foreground and prints `OPENAI_BASE_URL` and `OPENAI_API_KEY`, for any other tool that accepts an OpenAI-compatible endpoint |

Settings (`--set key=value [--global]`):

| Key | Default | Meaning |
|---|---|---|
| `graphifyModel` | agy's default | an agy model id (see `--list-models`) |
| `graphifyEffort` | `low` | extraction is structured work. In a test `low` used about 40 times fewer output tokens than `high` (685 against 29,996) and took 15 s instead of 207 s. The value is matched to what the model accepts |
| `graphifyConcurrency` | `3` | parallel Antigravity calls (1 to 8) |
| `graphifyLabels` | `true` | `false` skips community naming (`graphify cluster-only --no-label`) |

## 8. What was measured

A real run (Windows 11, graphify 0.9.86, agy 1.4.8, default model), repository with one code file and one doc:

| Step | Result |
|---|---|
| `git commit` with the hook installed | returned in 0.3 s |
| background update after a change to the doc and to the code | 22 s, 1 Antigravity call, 10,927 tokens in, 864 out; graph grew from 10 to 14 nodes and from 9 to 12 edges |
| a second extraction with one unchanged and one changed document | graphify served the unchanged one from its cache; one document was sent to the model |
| Claude / Codex tokens | 0 |

These are one machine and a tiny repository: a large documentation tree takes longer in proportion to the number of changed documents and the model you pick.

## 9. Limits, honestly

- **It uses your Antigravity quota.** The point is a cheaper model instead of an expensive one, not "free".
- **Images are not extracted** on this path: graphify does not send images to this backend by default, and agy cannot see them through it. Audio and video are transcribed locally by graphify.
- Docs and papers are text sent to Google's model (with recognised secrets redacted). Do not use it on documents you may not share.
- Quality depends on the model. Try another with `--set graphifyModel=<id>` and compare the graphs.
- The first full build reads every doc; run it once, in the background, with a model you are happy with.
- The hooks run code on every commit. It is the same trust as graphify's own hooks; remove them with `--graphify hook-uninstall`.
- Tested end to end with graphify 0.9.86 (pip). `--graphify setup --yes` on a `uv tool` install of graphify was not run by the author.

## 10. Troubleshooting

| Symptom | Fix |
|---|---|
| `openai package ... missing` | `--graphify setup --yes`, or `uv tool install --force "graphifyy[openai]"` (pipx: `pipx inject graphifyy openai`) |
| `could not find graphify's Python` | set `AGY_GRAPHIFY_PYTHON` to the interpreter graphify runs on |
| nothing updates after a commit | `--graphify status`; read `graphify-out/.agy-update.log`; check `.git/hooks/post-commit` has the `agy-graphify-hook` block; no graph yet means the hook does nothing: `--graphify update --full` |
| `agy returned no answer` for a chunk | graphify retries that chunk on the next update; check sign-in and quota with `agy -p "say hi"`; try another model |
| two updates seem to collide | they cannot: a lock makes the second ask for one more round; delete `graphify-out/.agy-update.lock` only if a crashed update left it behind |
| `skill is from graphify X, but the package is Y` | graphify's own warning; upgrade with `uv tool upgrade graphifyy` |
| Windows: hook does nothing | Git for Windows runs hooks with its own `sh`; `bun` or `node` must be on the `PATH` that git sees |

## 11. For tool authors

`--graphify serve` is a general building block: a local OpenAI-compatible endpoint on Antigravity (`POST /v1/chat/completions`, `GET /v1/models`; model name `agy` or `agy:<agy model id>`). Image parts are replaced with a note, the system and user messages are flattened into one prompt, a JSON reply is cleaned of fences and prose, and usage is reported from agy. Environment overrides: `AGY_GRAPHIFY_CMD` (the graphify command, a JSON array if a path has spaces), `AGY_GRAPHIFY_PYTHON`, `AGY_REVIEW_HOME`.
