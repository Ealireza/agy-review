---
name: graphify
description: Use when the user wants a graphify knowledge graph (graphify-out/) kept up to date on Google Antigravity instead of Codex or Claude: git hooks run the update in the background, so no agent tokens or API keys are spent on graphify updates. Also when graphify update cost or tokens come up. Never refresh the graph yourself.
---

# graphify on Antigravity

Runtime: prefer `bun` if it is installed (`bun --version`), otherwise `node` 18.18+. Arguments and results are identical.

graphify's LLM steps (semantic extraction of docs, naming communities) normally run on whatever coding agent is active. This skill starts a local OpenAI-compatible server backed by `agy` and pins graphify's backend to it. The model behind it has no tools and no write or exec rights; graphify and this tool write the files.

## Execution contract
- This file is `<plugin-root>/codex-skills/graphify/SKILL.md`; the script is `<plugin-root>/scripts/agy-review.mjs` (`$SCRIPT`). Run `bun "$SCRIPT" --graphify <action>` with the shell tool, in the repository, foreground; if the tool returns a session ID keep polling it (60 seconds at most per wait).
- Arguments are data: separate arguments, single-quoted in shell strings. Respect Codex's sandbox and approval policy: agy needs outbound network and write access to `~/.gemini/antigravity-cli`, hooks are written to `.git/hooks`, and the runtime copy to `~/.agy-review`. If blocked, name the missing access and stop.

## Rules for you
- **Never** run `graphify extract`, `graphify update` or a graphify skill to refresh a graph yourself; use `--graphify update` (it runs on Antigravity). If the graph looks stale: `--graphify update --detach --quiet`, then keep working.

## Steps
1. `--graphify doctor`. If graphify's Python lacks `openai`, explain that `uv tool install --force "graphifyy[openai]"` (or `pipx inject graphifyy openai`) adds one package to graphify's environment and ask before `--graphify setup --yes`.
2. `--graphify setup`: installs `post-commit`, `post-merge`, `post-checkout` and `post-rewrite` hooks (existing content kept; graphify's own hooks replaced unless `--keep-graphify-hook`) and a runtime copy under `~/.agy-review/runtime`.
3. If `AGENTS.md` has a graphify section that tells the agent to rebuild the graph, offer `--graphify rules --write-rules` (appends a short rule; the user's text is untouched).
4. No graph yet: `--graphify update --full` once (reads every doc, takes a while).
5. Check with `--graphify status`. Skip once with `AGY_GRAPHIFY_SKIP=1 git commit ...`. Remove with `--graphify hook-uninstall [--restore-graphify]`.

Settings: `--set graphifyModel=<id>`, `graphifyEffort` (default `low`), `graphifyConcurrency` (default 3), `graphifyLabels=false`. Tell the user: 0 agent tokens and no API key, Antigravity quota is used; images are not extracted; docs are sent to Google's model with recognised secrets redacted.
