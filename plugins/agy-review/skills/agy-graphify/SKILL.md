---
name: agy-graphify
description: Keep a graphify knowledge graph (graphify-out/) up to date on Google Antigravity instead of the coding agent. Git hooks (post-commit, post-merge, post-checkout, post-rewrite) run the update in the background, so Claude or Codex tokens and API keys are never spent on graphify updates. Use when the user mentions graphify updates, graph refresh cost or tokens, wants graphify to update on commit, push or merge, or asks to move graphify's LLM work to a cheaper model. Never refresh the graph yourself.
---

# agy-graphify: graphify updates on Antigravity, zero agent tokens

graphify does its deterministic work itself (tree-sitter AST, clustering, report, cache, merge). Only two steps use a language model: semantic extraction of docs and papers, and naming communities. Without a pinned backend graphify picks one by itself, and inside a coding agent that is the coding agent (or its subscription): that is where the tokens go. `--graphify` starts a tiny local OpenAI-compatible server backed by `agy` and **pins every LLM step of graphify to it**. The model behind it gets plain text and returns plain text: it has no tools, no files and no write or exec rights. Everything that is written is written by graphify (`graphify-out/`) and by this tool (hooks, a lock, a log).

Runtime: prefer `bun` if it is installed (`bun --version`), otherwise `node` 18.18+. Script: `bun "${CLAUDE_PLUGIN_ROOT}/scripts/agy-review.mjs" --graphify <action>`.

## Rules for you, the agent
- **Never** run `/graphify --update`, `graphify extract` or `graphify update` yourself to refresh a graph, and do not rebuild it after code changes. That spends the user's tokens. Use `--graphify update` (it runs on Antigravity).
- If the graph looks stale: `--graphify update --detach --quiet` returns at once; keep working with the current graph.
- Read `graphify-out/GRAPH_REPORT.md` and query the graph as usual.

## Set it up (once per repository)
1. `--graphify doctor`: checks graphify, agy, and that graphify's own Python has the `openai` package (graphify talks to the local server through it).
2. If `openai` is missing, tell the user it adds one package to graphify's environment (`uv tool install --force "graphifyy[openai]"`, or `pipx inject graphifyy openai`) and ask before running `--graphify setup --yes`. Never do it silently.
3. `--graphify setup` installs the git hooks and a self-contained runtime copy under `~/.agy-review/runtime` (hooks keep working after plugin updates). By default it **replaces graphify's own hooks** (they rebuild code only; ours do that and more; `--keep-graphify-hook` keeps both). Existing hook content is preserved.
4. If `CLAUDE.md` or `AGENTS.md` has a graphify section telling the agent to rebuild the graph, offer `--graphify rules --write-rules`, which appends a short rule that stops that (the user's own text is never edited).
5. No graph yet? The first build reads every doc, so it takes a while: run `--graphify update --full` (use a long timeout or run it in the background and tell the user).

## Afterwards
Every commit, merge, branch checkout and rebase runs `--graphify update --detach --quiet`: the git command returns immediately and the update finishes in the background (`graphify-out/.agy-update.log`, status in `.agy-update.json`). Check with `--graphify status`. Skip once: `AGY_GRAPHIFY_SKIP=1 git commit ...`. Remove: `--graphify hook-uninstall [--restore-graphify]`.

## Choose model and effort
Settings (`--set key=value [--global]`): `graphifyModel` (an agy model id; see `--list-models`), `graphifyEffort` (default `low`: extraction is structured work and `low` was about 40 times cheaper than `high` in a test), `graphifyConcurrency` (default 3), `graphifyLabels` (`false` skips community naming). Effort is adjusted to what the model accepts.

## What to tell the user
- Updates now cost **0 Claude or Codex tokens and need no API key**; they use the user's Antigravity quota. In a real test: a 2-file change updated in 22 seconds with 1 agy call.
- Code is parsed locally. Docs and papers (text) go through Antigravity, with recognised secrets redacted. **Images are not extracted** (graphify skips them for this backend); audio and video are transcribed locally by graphify.
- Output quality depends on the model chosen. `--debug` keeps each request and reply under `graphify-out/.agy-debug/` (they contain your documents).
