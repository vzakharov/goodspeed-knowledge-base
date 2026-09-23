#!/bin/bash
# Vet: the fast checks the agent runs before pushing review-ready work.
#
# See CLAUDE.md → Vetting for the contract and for why this list is what it is.
set -uo pipefail

cd "$(dirname "$0")/.."

status=0

# Runs a step alone, replaying its log only on failure. The log sits in tmp/
# rather than run-parallel.sh's log directory, which the fan-out wipes at startup.
alone() {
  local name=$1
  shift
  if ! "$@" >"tmp/vet-$name.log" 2>&1; then
    sed "s/^/[$name] /" "tmp/vet-$name.log"
    printf '[%s] full log: tmp/vet-%s.log\n' "$name" "$name"
    status=1
  fi
}

mkdir -p tmp
alone build pnpm build
alone styles pnpm styles:codegen

# Why each is safe beside the rest:
# - typecheck: Turborepo's `typecheck` depends on `build`, a cache hit by now.
# - type-overlap and knip read source only; test writes only to the OS temp directory.
# - squash reads docs/remove-before-merging/, skills the agent infrastructure.
# - test-db and test-e2e touch only the local stack: pgTAP rolls each file back,
#   and the end-to-end run signs up users of its own.
scripts/run-parallel.sh \
  typecheck='pnpm typecheck' \
  eslint='pnpm exec eslint .' \
  format='pnpm format:check' \
  stylelint='pnpm lint:css' \
  fsd='pnpm lint:fsd' \
  type-overlap='pnpm type-overlap' \
  knip='pnpm knip' \
  test='pnpm test' \
  test-db='pnpm test:db' \
  test-e2e='pnpm test:e2e' \
  squash='scripts/check-squash-message.sh' \
  skills='scripts/check-skill-catalog.sh' || status=1

if ((status)); then
  printf '\nvet FAILED\n' >&2
  exit 1
fi

printf '\nvet OK\n'
