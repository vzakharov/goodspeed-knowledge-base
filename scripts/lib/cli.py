"""Command-line plumbing shared by the stdlib-only scripts in `scripts/`.

Imported as `from lib.cli import die`. Running a script as
`python3 scripts/<name>.py` puts `scripts/` on `sys.path[0]`, so `lib.cli`
resolves as a PEP 420 namespace package from any working directory — no
`__init__.py`, no `sys.path` manipulation.

It lives here rather than in `lib/github.py` for the reason `lib/media.py`
gives for itself: not every script that needs it talks to GitHub, and a home
under the GitHub plumbing would make those import an API client to print an
error.

Stdlib only — no third-party deps. Python 3.9+.
"""

from __future__ import annotations

import sys
from typing import NoReturn


def die(msg: str, code: int = 1) -> NoReturn:
    print(msg, file=sys.stderr)
    sys.exit(code)
