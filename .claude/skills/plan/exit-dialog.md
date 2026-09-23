# Exit plan mode to plan on disk — repo convention

This project plans in a git-tracked file rather than in the plan-mode dialog:
the plan goes to `docs/plans/<task-slug>.draft.do-not-implement.md` and is
published as a draft PR, so it is reviewable as a diff from any machine and its
filename carries the approval gate. Plan mode holds the session to read-only
work, so none of that gets written until you approve this.

**Approving this authorizes writing the plan file and nothing else** — not the
work it describes. The plan keeps its `do-not-implement` name until you give an
explicit go-ahead.

**Reject it if you would rather use native plan mode.** That is how to say so,
and it holds for the rest of the session.
