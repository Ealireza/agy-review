---
description: Security review (CWE/OWASP, pattern scan, related code) of a function, file, snippet, diff or branch with Antigravity
argument-hint: '[--symbol <name> | --file <path[:A-B]> | --stdin | --staged | --base <ref> | --commit <sha>] [--context "<trust boundary>"] [--model <id>] [--fail-on high] [--format json]'
disable-model-invocation: true
allowed-tools: Bash(bun:*), Bash(node:*), Bash(git:*), Read, Glob, Grep
---

Run a security review with Antigravity and show the result.

Raw arguments: `$ARGUMENTS`

Runtime: prefer `bun` if it is installed (`bun --version`), otherwise `node` 18.18+. Arguments and results are identical.

Follow the `agy-security` skill. Run from the repository root with each raw argument as its own properly shell-quoted argument:

```bash
bun "${CLAUDE_PLUGIN_ROOT}/scripts/agy-review.mjs" --security <arguments>   # or: node ...  if bun is not installed
```

- With no target it reviews the uncommitted changes (agentic, read-only, needs `/agy-review:setup`). `--symbol`, `--file` and `--stdin` review that code together with its callers and callees, without repository access for the model.
- Use a Bash timeout of 600000 ms. Return the script's stdout verbatim; do not fix anything.
- Exit codes: `4` means inconclusive and is not a pass (say so); `10` means the `--fail-on` gate failed (the report is valid); `2` a prerequisite is missing (suggest `/agy-review:setup`); `3` the working tree changed during the review.
- State that a `cve` shown in the report is the model's claim and unverified.
