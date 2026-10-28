#!/bin/sh
# Optional git pre-commit hook: security-review the staged changes with Antigravity and block the commit on high or worse.
# Install:  cp examples/pre-commit.sh .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit
# Needs: agy (signed in), the guard (--install-guard), bun or node. A review takes about a minute; skip once with  git commit --no-verify
SCRIPT="${AGY_REVIEW_SCRIPT:-$HOME/agy-review/plugins/agy-review/scripts/agy-review.mjs}"
RT=$(command -v bun >/dev/null 2>&1 && echo bun || echo node)
git diff --cached --quiet && exit 0
"$RT" "$SCRIPT" --security --staged --fail-on high
code=$?
case $code in
  0) exit 0 ;;
  10) echo "agy-review: commit blocked, high or critical security finding (see report above)." >&2; exit 1 ;;
  4) echo "agy-review: review was inconclusive, not a pass. Re-run or commit with --no-verify." >&2; exit 1 ;;
  *) echo "agy-review: could not complete (exit $code); not blocking the commit." >&2; exit 0 ;;
esac
