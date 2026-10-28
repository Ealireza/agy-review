---
description: Prove that Antigravity reviews are read-only on this machine
disable-model-invocation: true
allowed-tools: Bash(bun:*), Bash(node:*)
---

Run `bun "${CLAUDE_PLUGIN_ROOT}/scripts/agy-review.mjs" --verify` with a Bash timeout of 360000 ms and show the output verbatim.

This makes one small live agy call in a throwaway temp folder. It asks agy to read a file, then to write a file, redirect into a file, and delete a file. It passes only if the read works and all three write attempts are blocked.

If any line is `FAIL`, tell the user not to use `/agy-review:review` on code they care about, and suggest opening an issue with the output.
