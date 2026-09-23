#!/bin/bash
# Vet: the fast checks the agent runs before pushing review-ready work.
#
# See CLAUDE.md → Vetting for the contract and for why this list is what it is.
set -uo pipefail

cd "$(dirname "$0")/.."

status=0

# Runs alone, and first. `next build` regenerates `apps/web/.next/types/`, which
# that workspace's tsconfig includes, so overlapping it with the type check makes
# tsc read a route-type module the build has not finished writing — an
# intermittent TS2307 on an import that is fine by the time anyone looks.
#
# Kept out of the fan-out below rather than run as a batch of its own, because
# run-parallel.sh wipes its log directory at startup — a build log written there
# would be gone by the time the second batch finished citing it.
mkdir -p tmp
if ! pnpm build >tmp/vet-build.log 2>&1; then
  sed 's/^/[build] /' tmp/vet-build.log
  printf '[build] full log: tmp/vet-build.log\n'
  status=1
fi

# The one check that repairs what it finds, and it reports by failing: the
# generator exits non-zero exactly when it had to write, so a stale partial is
# both fixed and named in one pass and `git diff` is the report.
#
# It runs alone because it *writes* two `.scss` files that the fan-out's
# stylelint and Prettier glob, and would hand one of them over truncated.
if ! pnpm styles:codegen >tmp/vet-styles.log 2>&1; then
  sed 's/^/[styles] /' tmp/vet-styles.log
  printf '[styles] full log: tmp/vet-styles.log\n'
  status=1
fi

# None of these writes anything another one reads, so they overlap freely.
# Not `pnpm lint` — it carries --fix, and the fan-out must not mutate the tree;
# `lint:css` is the check-only stylelint form, for the same reason.
# The type check's workspace half goes through Turborepo, whose `typecheck`
# depends on `build` — a cache hit on the build that just ran, never a rebuild.
# type-overlap reads source text only; the test run writes only into the OS
# temp directory; the Mantine check reads what the build already finished
# writing under `apps/*/out/`. The squash check reads the proposal under
# docs/remove-before-merging/, and the last reads the agent infrastructure,
# neither of which anything else here touches.
scripts/run-parallel.sh \
  typecheck='pnpm typecheck' \
  eslint='pnpm exec eslint .' \
  format='pnpm format:check' \
  stylelint='pnpm lint:css' \
  fsd='pnpm lint:fsd' \
  type-overlap='pnpm type-overlap' \
  mantine-styles='pnpm check:mantine-styles' \
  test='pnpm test' \
  squash='scripts/check-squash-message.sh' \
  skills='scripts/check-skill-catalog.sh' || status=1

if ((status)); then
  printf '\nvet FAILED\n' >&2
  exit 1
fi

printf '\nvet OK\n'
