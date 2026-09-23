"""The timeline section: one line per status, reference and other event."""

from __future__ import annotations

from typing import Any

from gh_export.authorship import login_of

_STATIC_TIMELINE_SUFFIXES = {
    "reopened": "reopened {noun}.",
    "locked": "locked {noun}.",
    "unlocked": "unlocked {noun}.",
    "pinned": "pinned {noun}.",
    "unpinned": "unpinned {noun}.",
    "transferred": "transferred {noun}.",
    "connected": "connected {noun} (integration).",
    "disconnected": "disconnected {noun} (integration).",
    "head_ref_deleted": "deleted the head ref.",
    "head_ref_restored": "restored the head ref.",
    "merged": "merged {noun}.",
    "ready_for_review": "marked {noun} ready for review.",
    "convert_to_draft": "converted {noun} to a draft.",
}

_TIMELINE_SKIP = frozenset({"committed", "commented"})


def _reviewer_name(ev: dict[str, Any]) -> str:
    reviewer = login_of(ev.get("requested_reviewer"), "")
    if reviewer:
        return f"@{reviewer}"
    team = (ev.get("requested_team") or {}).get("name")
    return f"team «{team}»" if team else "?"


def _timeline_suffix(ev: dict[str, Any], noun: str) -> str:
    """Return the phrase after `@{who} ` for a timeline event."""
    kind = ev.get("event") or ""
    if kind in _STATIC_TIMELINE_SUFFIXES:
        return _STATIC_TIMELINE_SUFFIXES[kind].format(noun=noun)

    label = (ev.get("label") or {}).get("name", "?")
    assignee = (ev.get("assignee") or {}).get("login", "?")
    milestone = (ev.get("milestone") or {}).get("title", "?")

    if kind == "closed":
        reason = ev.get("state_reason")
        return f"closed {noun} ({reason})." if reason else f"closed {noun}."
    if kind == "renamed":
        r = ev.get("rename") or {}
        return f"renamed from «{r.get('from', '?')}» to «{r.get('to', '?')}»."
    if kind == "labeled":
        return f"added label `{label}`."
    if kind == "unlabeled":
        return f"removed label `{label}`."
    if kind == "assigned":
        return f"assigned @{assignee}."
    if kind == "unassigned":
        return f"unassigned @{assignee}."
    if kind == "milestoned":
        return f"added milestone «{milestone}»."
    if kind == "demilestoned":
        return f"removed milestone «{milestone}»."
    if kind == "referenced":
        commit = ev.get("commit_url") or ev.get("commit_id") or ""
        note = f": {commit}" if commit else ""
        return f"referenced {noun} in a commit{note}."
    if kind == "cross-referenced":
        src = (ev.get("source") or {}).get("issue") or {}
        href = src.get("html_url")
        link = (
            f"[#{src.get('number', '?')} {src.get('title', '')}]({href})"
            if href
            else "(source issue unavailable)"
        )
        return f"cross-referenced {noun} from {link}."
    if kind == "reviewed":
        state = (ev.get("state") or "reviewed").upper()
        href = ev.get("html_url") or ""
        link = f": {href}" if href else ""
        return f"reviewed ({state}){link}."
    if kind == "review_requested":
        return f"requested a review from {_reviewer_name(ev)}."
    if kind == "review_request_removed":
        return f"removed the review request for {_reviewer_name(ev)}."
    return f"— _{kind}_"


def format_timeline_line(ev: dict[str, Any], noun: str) -> str:
    kind = ev.get("event") or ""
    if kind in _TIMELINE_SKIP:
        return ""
    # `reviewed` events are review payloads: they carry `user`/`submitted_at`
    # where every other event carries `actor`/`created_at`.
    who = login_of(ev.get("actor") or ev.get("user"), "unknown")
    when = ev.get("created_at") or ev.get("submitted_at") or ""
    return f"- **{when}** @{who} {_timeline_suffix(ev, noun)}"


def timeline_section(events: list[dict[str, Any]], noun: str) -> str:
    lines = [line for ev in events if (line := format_timeline_line(ev, noun))]
    if not lines:
        return ""
    return "\n".join(
        ["## Timeline (status, references, and other events)", "", *lines, ""]
    )
