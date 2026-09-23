#!/usr/bin/env bash
# The single merge-target check behind the `/check-merge` skill. Checks once
# whether the branch's **merge target** has moved out from under the current
# branch since it last incorporated it, or whether the PR landed — then exits so
# the agent can hand back to the enclosing flow.
#
# The merge target is the branch the open PR is **based on** — resolved from the
# PR, not hardcoded to the default branch — so the check is correct for a PR
# based on a promotion branch or a long-lived feature branch, not just `main`.
# It falls back to the repo default branch when there's no PR yet.
#
# Stateless: it computes everything from git on each run (no baseline file). The
# branch's own history is the reference point — once you merge the new target
# into the branch, the next check naturally reports "contained". Nothing to
# reset, and no false "advanced" after a merge you already did.
#
# Lightweight: resolving the target and fetching it is a couple of `gh`/`git`
# calls plus a local ancestry test; the PR state fetched while resolving the
# target also tells a PR that landed from a plain advance, so no second lookup.
#
# Usage:
#   scripts/check-merge.sh    # run once; reports movement / landing
#
# Exit codes:
#   0  - the branch already contains the target's tip (nothing to merge),
#        OR a transient network failure (fails safe rather than crying wolf).
#   10 - the target advanced beyond this branch. The caller deliberates.
#   20 - this branch's PR was merged. The work landed.
#   21 - this branch's PR was closed without merging.
#   1  - hard error (detached HEAD, gh lookup failure, missing tooling).

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
PROG="check-merge"
GH_REPO_PROG="$PROG"

# shellcheck source=scripts/lib/gh-repo.sh
source "${REPO_ROOT}/scripts/lib/gh-repo.sh"

for tool in gh jq git; do
  command -v "$tool" >/dev/null 2>&1 || {
    echo "${PROG}: required tool '${tool}' not found on PATH." >&2
    exit 1
  }
done

branch="$(git branch --show-current)"
if [[ -z "$branch" ]]; then
  echo "${PROG}: HEAD is detached; nothing to check." >&2
  exit 1
fi

gh_resolve_repo  # sets NWO, REPO_FLAG

# Resolve the repo default branch (don't hardcode "main") — the fallback target
# when the branch has no PR yet.
default_branch="$(gh "${REPO_FLAG[@]}" repo view --json defaultBranchRef --jq '.defaultBranchRef.name' 2>/dev/null || true)"
if [[ -z "$default_branch" || "$default_branch" == "null" ]]; then
  default_branch="main"
fi

# Resolve the merge target from the branch's PR: the branch it's **based on**, so
# the check is correct for a PR based on something other than the default branch.
# The same lookup yields the PR state, which classifies a landing below without a
# second gh call. Use `pr list --head`, not `pr view <branch>`, and do NOT
# swallow stderr, so a real gh error surfaces instead of masquerading as "no PR
# found".
if ! pr_json="$(gh "${REPO_FLAG[@]}" pr list --head "$branch" --state all --json baseRefName,state --jq '.[0] // empty')"; then
  echo "${PROG}: gh pr lookup for branch '${branch}' failed; cannot determine the merge target." >&2
  exit 1
fi
pr_base=""
pr_state=""
if [[ -n "$pr_json" ]]; then
  pr_base="$(jq -r '.baseRefName // empty' <<<"$pr_json")"
  pr_state="$(jq -r '.state // empty' <<<"$pr_json")"
fi
target="${pr_base:-$default_branch}"

now="$(date -u +%FT%TZ)"

# Fetch the target tip. A transient failure fails safe (exit 0) so a one-off
# check doesn't cry wolf — just re-run.
if ! git fetch origin "$target" --quiet 2>/dev/null; then
  echo "${PROG}: fetch of origin/${target} failed (transient?); re-run /check-merge to retry."
  exit 0
fi
tip="$(git rev-parse FETCH_HEAD)"

# Branch already contains the target's current tip → nothing moved out from under
# it. This is also what a check reports right after you merge the target in,
# which is why no separate baseline reset is needed.
if git merge-base --is-ancestor "$tip" HEAD; then
  echo "check=${now} target=${target} tip=${tip:0:8} contained (nothing to merge)"
  exit 0
fi

# The target is ahead of this branch. Find out why: did our PR land, or did the
# branch just fall behind? Squash-merge means our commits never become ancestors
# of the target, so the PR state (fetched above) — not an ancestor check — is the
# authority on landing.
if [[ "$pr_state" == "MERGED" ]]; then
  echo "check=${now} target=${target} PR merged — work landed."
  exit 20
fi
if [[ "$pr_state" == "CLOSED" ]]; then
  echo "check=${now} target=${target} PR closed without merging."
  exit 21
fi

# PR still open (or none yet) and the target advanced. `base` is the commit the
# branch already contains — what the enclosing flow's deliberation diffs
# origin/<target> against.
base="$(git merge-base HEAD "$tip" 2>/dev/null || echo "")"
echo "check=${now} target=${target} advanced base=${base:0:8} new=${tip:0:8}"
exit 10
