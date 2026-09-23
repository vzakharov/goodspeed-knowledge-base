"""Who wrote a post: the login, and whether the agent or a human wrote it.

`$GH_TOKEN` is the operator's own identity, so agent replies and human guidance
arrive under one login and the Claude Code attribution footer is all that
separates them. The footer is therefore **mandatory** on every agent-authored
post — read here as a signal, not carried as a courtesy — and a post without one
exports as a human's.
"""

from __future__ import annotations

import re
from typing import Any

# The footer's two forms: this repo's comment rule, and the harness's own
# PR-description block.
_ATTRIBUTION_FOOTER = re.compile(
    r"(?:\A|\n)\s*"  # the whole body, or a break from the prose above
    r"(?:-{3,}[ \t]*\n\s*)?"  # optional horizontal rule
    r"(?:🤖[ \t]*)?"
    r"_?Generated (?:by|with) "
    r"\[Claude Code\]\(https://claude\.(?:ai/code|com/claude-code)/?\)_?"
    r"(?:\s*https://claude\.ai/code/session_[A-Za-z0-9_-]+)?"
    r"\s*\Z"
)


def login_of(holder: Any, default: str = "?") -> str:
    """Login of a `user`/`actor`/`requested_reviewer`-shaped nested object."""
    return (holder or {}).get("login") or default


def split_agent_footer(body: str) -> tuple[bool, str]:
    """Whether the body ends in an attribution footer, and the body without it.

    Anchored at the end, so a footer quoted mid-post stays prose rather than
    reading as a signature.
    """
    match = _ATTRIBUTION_FOOTER.search(body)
    if not match:
        return False, body.rstrip()
    return True, body[: match.start()].rstrip()


def attribution(holder: Any, by_agent: bool) -> str:
    """`@login (agent)` / `@login (human)` — `(human)` rather than the
    `(operator)` #55 asked for, a third-party reviewer being neither.
    """
    return f"@{login_of(holder)} ({'agent' if by_agent else 'human'})"
