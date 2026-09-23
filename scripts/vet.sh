#!/bin/bash
# Vet: the fast checks the agent runs before pushing review-ready work.
#
# See CLAUDE.md → Vetting for the contract and for why this list is what it is.
set -uo pipefail

cd "$(dirname "$0")/.."

status=0

# Runs one step on its own, replaying its log only when it fails. The log goes
# under tmp/ rather than through run-parallel.sh, which wipes its log directory
# at startup — a log written there would be gone by the time the fan-out
# finished citing it.
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

# The type check's workspace half goes through Turborepo, whose `typecheck`
# depends on `build` — a cache hit on the build that just ran, never a rebuild.
# type-overlap reads source text only; the test run writes only into the OS
# temp directory. The squash check reads the proposal under
# docs/remove-before-merging/, and the last reads the agent infrastructure,
# neither of which anything else here touches.
# The two database suites need the local stack `pnpm bootstrap` started, and
# touch nothing but it: pgTAP rolls each file back, and the API's end-to-end run
# signs up users of its own.
scripts/run-parallel.sh \
  typecheck='pnpm typecheck' \
  eslint='pnpm exec eslint .' \
  format='pnpm format:check' \
  stylelint='pnpm lint:css' \
  fsd='pnpm lint:fsd' \
  type-overlap='pnpm type-overlap' \
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
