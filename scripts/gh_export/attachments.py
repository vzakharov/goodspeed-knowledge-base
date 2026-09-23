"""Attachment discovery, download and link rewriting for the export."""

from __future__ import annotations

import os
import re
import urllib.parse
from pathlib import Path
from typing import NamedTuple

from gh_export.api import request
from lib.github import AllRoutesFailed, format_route_statuses
from lib.media import extension_for_bytes

ATTACHMENT_URL_RE = re.compile(
    r"https://(?:"
    r"private-user-images\.githubusercontent\.com/[^\s\"'\)<>]+|"
    r"user-images\.githubusercontent\.com/[^\s\"'\)<>]+|"
    r"github\.com/user-attachments/assets/[^\s\"'\)<>]+|"
    r"github\.com/user-attachments/files/[^\s\"'\)<>]+"
    r")",
    re.IGNORECASE,
)


def collect_attachment_urls(text: str) -> list[str]:
    seen: set[str] = set()
    ordered: list[str] = []
    for m in ATTACHMENT_URL_RE.finditer(text):
        url = re.sub(r"[),.;]+$", "", m.group(0))
        if url not in seen:
            seen.add(url)
            ordered.append(url)
    return ordered


def slug_from_url(url: str, index: int) -> str:
    try:
        parsed = urllib.parse.urlparse(url)
        base = os.path.basename(parsed.path) or f"asset-{index}"
        safe = re.sub(r"[^\w.-]+", "_", base)[:180]
        return safe or f"asset-{index}"
    except Exception:
        return f"asset-{index}"


class AttachmentDownloadError(Exception):
    """Every route failed for one attachment.

    Built from `format_route_statuses` — see there for why no response body may
    reach this message.
    """


def download_asset(url: str, dest: Path, token: str) -> str:
    try:
        buf, headers = request(url, token, "application/octet-stream")
    except AllRoutesFailed as exc:
        raise AttachmentDownloadError(format_route_statuses(exc.failures)) from exc

    ext = extension_for_bytes(buf, headers.get("content-type"))
    write_path = dest if dest.suffix else (Path(str(dest) + ext) if ext else dest)
    write_path.write_bytes(buf)
    return f"./attachments/{write_path.name}"


class AttachmentDownloads(NamedTuple):
    """One thread's attachment URLs split by outcome, both halves keyed by URL."""

    url_to_relative: dict[str, str]
    failures: dict[str, str]


def download_attachments(
    urls: list[str], attachments_dir: Path, token: str
) -> AttachmentDownloads:
    if not urls:
        return AttachmentDownloads({}, {})
    attachments_dir.mkdir(parents=True, exist_ok=True)
    url_to_relative: dict[str, str] = {}
    failures: dict[str, str] = {}
    used: set[str] = set()
    for idx, url in enumerate(urls, start=1):
        base_name = slug_from_url(url, idx)
        if base_name in used:
            stem, ext = os.path.splitext(base_name)
            n = 2
            while f"{stem}-{n}{ext}" in used:
                n += 1
            base_name = f"{stem}-{n}{ext}"
        try:
            rel = download_asset(url, attachments_dir / base_name, token)
        except AttachmentDownloadError as exc:
            failures[url] = str(exc)
            continue
        used.add(os.path.basename(rel))
        url_to_relative[url] = rel
    return AttachmentDownloads(url_to_relative, failures)


def rewrite_attachment_refs(text: str, url_to_relative: dict[str, str]) -> str:
    for url, rel in url_to_relative.items():
        text = text.replace(url, rel)
    return text
