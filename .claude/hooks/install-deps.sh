#!/bin/bash
# SessionStart hook: re-sync installed dependencies with the lockfile.
#
# Remote/web sessions can resume with a stale dependency tree if the lockfile
# advanced since the environment snapshot was built (the setup script runs once
# at snapshot build time, then is cached — see
# https://code.claude.com/docs/en/claude-code-on-the-web#setup-scripts).
# Re-running on every session start keeps the install tree tracking the current
# lockfile.
#
# Remote-only: a local session installs its own dependencies when it wants them,
# and paying an install on every `claude` launch is not what anyone wants.
#
# The paired site of `scripts/vet.sh`, per `.claude/rules/stack.md`: both name this
# project's package manager, and a toolchain change moves both.

set -euo pipefail

[ "${CLAUDE_CODE_REMOTE:-}" = "true" ] || exit 0

cd "${CLAUDE_PROJECT_DIR:-$(pwd)}"

corepack enable pnpm >/dev/null 2>&1 || true
pnpm install --frozen-lockfile
