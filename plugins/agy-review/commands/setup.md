---
description: Check prerequisites and install the read-only guard for Antigravity
disable-model-invocation: true
allowed-tools: Bash(bun:*), Bash(node:*)
---

Prepare this machine for `/agy-review:review`.

1. Run `bun "${CLAUDE_PLUGIN_ROOT}/scripts/agy-review.mjs" --check` and show the output.
2. If the read-only guard is `missing` or `outdated`, explain in one sentence that it is a small hook installed into `~/.gemini/config/plugins/readonly-review` that makes agy reviews read-only, then run `bun "${CLAUDE_PLUGIN_ROOT}/scripts/agy-review.mjs" --install-guard`.
3. If `agy` is missing, do not install it yourself. Tell the user to install the Antigravity CLI from https://antigravity.google/cli and run `agy` once in a terminal to sign in.
4. Finish by recommending `/agy-review:verify`, which proves on this machine that writes are blocked.
