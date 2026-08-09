#!/usr/bin/env python3
"""Refresh citation counts in src/data/publications.yml from OpenAlex.

OpenAlex is a fully open catalogue of scholarly works with no API key and no
rate limit worth worrying about at this scale. Counts are written back into the
YAML at build time rather than fetched in the browser, so the published page
stays static, works without JavaScript, and does not depend on an API being up
when someone visits.

Note these counts will not match Google Scholar, which indexes a broader and
less curated set of sources and generally reports higher numbers.

Usage:
    python3 scripts/update_citations.py
    python3 scripts/update_citations.py --dry-run
    python3 scripts/update_citations.py --quiet

Exit codes:
    0  file updated, or already up to date
    1  something went wrong (network, parse, no DOIs found)

Requires no third-party packages: only the standard library.
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import NoReturn

REPO = Path(__file__).resolve().parent.parent
PUBS = REPO / "src" / "data" / "publications.yml"

MAILTO = "greg.m.lucas@gmail.com"
USER_AGENT = f"greglucas.github.io (+https://greglucas.github.io; mailto:{MAILTO})"

# OpenAlex accepts up to 100 values in an OR filter; stay under it.
BATCH = 50


def die(msg: str) -> NoReturn:
    print(f"error: {msg}", file=sys.stderr)
    sys.exit(1)


def fetch_batch(dois: list[str]) -> dict[str, int]:
    """Return {lowercased doi: citation count} for one batch of DOIs."""
    filt = "doi:" + "|".join(dois)
    params = urllib.parse.urlencode(
        {
            "filter": filt,
            "select": "doi,cited_by_count",
            "per-page": str(len(dois)),
            "mailto": MAILTO,
        }
    )
    url = f"https://api.openalex.org/works?{params}"
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})

    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            payload = json.load(resp)
    except urllib.error.HTTPError as e:
        die(f"OpenAlex request failed ({e.code} {e.reason})")
    except urllib.error.URLError as e:
        die(f"could not reach OpenAlex: {e.reason}")

    counts: dict[str, int] = {}
    for work in payload.get("results", []):
        doi_url = work.get("doi") or ""
        doi = re.sub(r"^https?://(dx\.)?doi\.org/", "", doi_url, flags=re.I).lower()
        if doi:
            counts[doi] = int(work.get("cited_by_count") or 0)
    return counts


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--dry-run", action="store_true", help="report changes without writing")
    p.add_argument("--quiet", action="store_true", help="only print the summary line")
    args = p.parse_args()

    if not PUBS.exists():
        die(f"{PUBS} not found")
    text = PUBS.read_text()

    dois = re.findall(r"^  doi:\s*(\S+)\s*$", text, re.M)
    if not dois:
        die("no DOIs found in publications.yml")

    counts: dict[str, int] = {}
    for i in range(0, len(dois), BATCH):
        counts.update(fetch_batch(dois[i : i + BATCH]))

    missing = [d for d in dois if d.lower() not in counts]
    today = dt.date.today().isoformat()

    lines = text.splitlines()
    out: list[str] = []
    changes: list[tuple[str, int | None, int]] = []
    i = 0

    while i < len(lines):
        line = lines[i]
        out.append(line)

        m = re.match(r"^  doi:\s*(\S+)\s*$", line)
        if not m:
            i += 1
            continue

        doi = m.group(1)
        new = counts.get(doi.lower())

        # Consume any existing citation lines that follow this doi so they are
        # replaced rather than duplicated.
        old: int | None = None
        j = i + 1
        while j < len(lines) and re.match(r"^  citations(_updated)?:", lines[j]):
            cm = re.match(r"^  citations:\s*(\d+)\s*$", lines[j])
            if cm:
                old = int(cm.group(1))
            j += 1

        if new is not None:
            out.append(f"  citations: {new}")
            out.append(f"  citations_updated: {today}")
            if old != new:
                changes.append((doi, old, new))

        i = j

    if missing and not args.quiet:
        print(f"note: OpenAlex has no record for {len(missing)} DOI(s):", file=sys.stderr)
        for d in missing:
            print(f"  {d}", file=sys.stderr)

    if not changes:
        print(f"Citation counts already up to date ({len(counts)} works).")
        return

    if not args.quiet:
        print(f"{len(changes)} citation count(s) changed:\n")
        for doi, old, new in sorted(changes, key=lambda c: c[2] - (c[1] or 0), reverse=True):
            delta = f"+{new - old}" if old is not None else "new"
            print(f"  {doi:<44} {str(old or '-'):>5} -> {new:<5} ({delta})")
        print()

    if args.dry_run:
        print("Dry run; no changes written.")
        return

    PUBS.write_text("\n".join(out) + "\n")
    total = sum(counts.values())
    print(f"Updated {PUBS.relative_to(REPO)}: {len(counts)} works, {total} total citations.")


if __name__ == "__main__":
    main()
