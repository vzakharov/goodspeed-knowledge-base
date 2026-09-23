#!/bin/sh
# Run several checks concurrently and report only what failed.
#
# Each argument is one check, either `<label>=<command>` (split at the **first**
# `=`) or a bare command that labels itself. Commands run via `sh -c`, so shell
# syntax works inside them.
#
#   scripts/run-parallel.sh lint='pnpm lint' typecheck='pnpm typecheck'
#   scripts/run-parallel.sh 'cargo clippy --all-targets -- -D warnings' 'cargo test'
#
# Splitting at the first `=` keeps a leading environment assignment working when
# the check is labeled (`test='CI=1 pnpm test'`); bare, `CI=1 pnpm test` reads
# as label `CI`. Label everything and the edge never comes up.
#
# Output is buffered per check under `tmp/run-parallel/` and printed only for
# the ones that failed, each line prefixed `[<label>] `. Lines containing the
# check mark are dropped as noise; every failing block ends with the path to its
# verbatim log, which is the way to see what the filter took out. While checks
# are still running, a liveness line names the unfinished ones every 10s.
#
# The run also compares `git status --porcelain` before and after: an autofix
# step (`prettier --write`, `eslint --fix`) rewrites files *and* exits 0, so a
# clean tree that came back dirty is worth naming before it gets committed
# without the fixes. Silently skipped outside a git work tree.
#
# POSIX `/bin/sh` on purpose: `scripts/vet.sh` is the one entrypoint every
# adopter must have, so its helper must not add an interpreter to the floor.
#
# The log directory is wiped at startup, so only one invocation at a time is
# supported.
#
# Exit codes:
#   0  - every check passed.
#   1  - a check failed, or the arguments were unusable.

set -eu

PROG="run-parallel"

die() {
  printf '%s: %s\n' "$PROG" "$1" >&2
  exit 1
}

usage() {
  cat >&2 <<EOF
usage: scripts/run-parallel.sh <label=command> [<label=command> ...]

  Runs each check concurrently and prints output only for the ones that fail.
  A label may contain [A-Za-z0-9_.:-]; an argument with no '=' is a bare
  command that labels itself.

  scripts/run-parallel.sh lint='pnpm lint' test='pnpm test:unit'
EOF
  exit 1
}

[ "$#" -gt 0 ] || usage

case "${1:-}" in
  -h | --help) usage ;;
esac

# Sets `label`, `cmd` and `labeled`. Both passes parse through here, so the
# label that gets validated is the one that gets run. Only an explicit label is
# constrained — a bare command labels itself and may contain anything.
parse_check() {
  case "$1" in
    *=*)
      label=${1%%=*}
      cmd=${1#*=}
      labeled=1
      ;;
    *)
      label=$1
      cmd=$1
      labeled=0
      ;;
  esac
}

# Validate every argument before launching anything, so a typo in the last
# check doesn't leave the first half of the run already going.
for arg in "$@"; do
  [ -n "$arg" ] || die "empty argument"
  parse_check "$arg"
  [ "$labeled" = "1" ] || continue
  [ -n "$label" ] || die "empty label in argument: $arg"
  case "$label" in
    *[!A-Za-z0-9_.:-]*)
      die "label '$label' has characters outside [A-Za-z0-9_.:-] — did an unquoted command get split? (argument: $arg)"
      ;;
  esac
  [ -n "$cmd" ] || die "empty command for label '$label'"
done

if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  IN_GIT=1
  ROOT="$(git rev-parse --show-toplevel)"
  STATUS_BEFORE="$(git status --porcelain)"
else
  IN_GIT=0
  ROOT="$(pwd)"
  STATUS_BEFORE=""
fi

RUN_DIR="$ROOT/tmp/run-parallel"
rm -rf "$RUN_DIR"
mkdir -p "$RUN_DIR"

# Bookkeeping lives in files keyed by index, not variables: labels contain
# spaces (a bare command labels itself) and so cannot be held in a word-split
# list, and the index keeps two same-labeled checks from sharing a log.
INDICES=""
PIDS=""
idx=0
for arg in "$@"; do
  idx=$((idx + 1))
  parse_check "$arg"

  printf '%s\n' "$label" >"$RUN_DIR/$idx.label"

  # The status file is written under a temporary name and renamed, so its
  # *existence* means "finished" and the poller can never read a half-written
  # code. `set +e` keeps a failing check from killing the subshell first.
  (
    set +e
    sh -c "$cmd" >"$RUN_DIR/$idx.log" 2>&1
    printf '%s\n' "$?" >"$RUN_DIR/$idx.status.part"
    mv "$RUN_DIR/$idx.status.part" "$RUN_DIR/$idx.status"
  ) &

  INDICES="$INDICES $idx"
  PIDS="$PIDS $!"
done

TOTAL=$idx

# Poll for status files rather than run a background ticker: no trap to install,
# no `sleep` loop that can outlive the script. `ticks` counts polls, so the
# reported age is approximate — enough to tell a slow run from a hung one.
ticks=0
while :; do
  finished=0
  pending=""
  sep=""
  for i in $INDICES; do
    if [ -f "$RUN_DIR/$i.status" ]; then
      finished=$((finished + 1))
    else
      pending="$pending$sep$(cat "$RUN_DIR/$i.label")"
      sep=", "
    fi
  done
  [ "$finished" -lt "$TOTAL" ] || break

  sleep 1
  ticks=$((ticks + 1))
  if [ $((ticks % 10)) -eq 0 ]; then
    printf '%s: still running (~%ss): %s\n' "$PROG" "$ticks" "$pending"
  fi
done

for pid in $PIDS; do
  wait "$pid" 2>/dev/null || :
done

failed=""
sep=""
for i in $INDICES; do
  code="$(cat "$RUN_DIR/$i.status")"
  [ "$code" != "0" ] || continue
  label="$(cat "$RUN_DIR/$i.label")"
  failed="$failed$sep$label"
  sep=", "

  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in
      *"✓"*) continue ;;
    esac
    printf '[%s] %s\n' "$label" "$line"
  done <"$RUN_DIR/$i.log"
  printf '[%s] exited %s — full log: %s\n' "$label" "$code" "$RUN_DIR/$i.log"
done

report_autofix() {
  [ "$IN_GIT" = "1" ] || return 0
  [ -z "$STATUS_BEFORE" ] || return 0
  status_after="$(git status --porcelain)"
  [ -n "$status_after" ] || return 0
  printf '\n%s: the tree was clean before this run and is dirty now. An autofix step rewrote these files and still exited 0, so commit them — otherwise the check-only counterpart in CI fails on the same files:\n' "$PROG"
  printf '%s\n' "$status_after"
}

if [ -z "$failed" ]; then
  printf 'All passed.\n'
  report_autofix
  exit 0
fi

printf 'Failed: %s\n' "$failed"
report_autofix
exit 1
