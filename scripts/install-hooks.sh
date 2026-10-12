#!/bin/sh
# Opt-in: point git at the repo's .githooks directory so the no-drift
# pre-commit gate runs. One-time per clone. Safe to re-run.
#
#   sh scripts/install-hooks.sh
#
set -e
git config core.hooksPath .githooks
chmod +x .githooks/pre-commit 2>/dev/null || true
echo "Git hooks installed (core.hooksPath = .githooks)."
echo "The pre-commit hook now runs 'npm run guide:check' when guide files change."
echo "Disable with: git config --unset core.hooksPath"
