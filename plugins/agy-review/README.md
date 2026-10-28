# agy-review

Claude Code plugin that gets a code review of your local git changes from Google Antigravity (`agy`). Antigravity reads the repository itself with read-only access and returns a graded review (Critical / High / Medium / Nits). It runs without permission prompts; a guard hook blocks writes, deletes, installs and network access.

Commands: `/agy-review:setup` (check requirements, install the guard), `/agy-review:verify` (live proof that writes are blocked), `/agy-review:review [--base <ref>] [focus text]`.

Needs the Antigravity CLI (signed in), Node.js 18.18+ and git. Full install guide, security model and limits: see the repository README.
