"""Media-type helpers shared by the stdlib-only scripts in `scripts/`.

Imported as `from lib.media import extension_for_bytes`. Running a script as
`python3 scripts/<name>.py` puts `scripts/` on `sys.path[0]`, so `lib.media`
resolves as a PEP 420 namespace package from any working directory — no
`__init__.py`, no `sys.path` manipulation.

It lives here rather than in `gh_export/` because both callers need it and only
one of them is the GitHub exporter: a repo that takes the session hooks without
the issue loop must still resolve this import.

Stdlib only — no third-party deps. Python 3.9+.
"""

from __future__ import annotations

from typing import Optional

# Declared type first, sniff second — the sniff is the fallback for a missing or
# generic one, which is how octet-stream downloads arrive.
_TYPE_TO_EXTENSION = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "image/svg+xml": ".svg",
}

_MAGIC_TO_EXTENSION = (
    (b"\x89PNG", ".png"),
    (b"\xff\xd8\xff", ".jpg"),
    (b"GIF", ".gif"),
    (b"RIFF", ".webp"),
)


def extension_for_bytes(buf: bytes, content_type: Optional[str]) -> str:
    """Return a leading-dot file extension, or "" when nothing identifies it."""
    ct = (content_type or "").split(";")[0].strip().lower()
    if ct in _TYPE_TO_EXTENSION:
        return _TYPE_TO_EXTENSION[ct]
    for magic, ext in _MAGIC_TO_EXTENSION:
        if buf[: len(magic)] == magic:
            return ext
    return ""
