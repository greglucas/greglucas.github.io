#!/usr/bin/env python3
"""Refresh Zenodo release metadata in src/data/software.yml.

Each package that has a Zenodo archive carries a `zenodo_concept_doi` - the DOI
that always points at the latest release rather than at one frozen version.
That is the DOI to cite, and it is set by hand.

This script resolves each concept DOI to its newest version and writes back
`version`, `version_doi` and `released`, so the software page can show what the
current release actually is without anyone remembering to update it.

Usage:
    python3 scripts/update_zenodo.py
    python3 scripts/update_zenodo.py --dry-run

Requires no third-party packages: only the standard library.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import NoReturn

REPO = Path(__file__).resolve().parent.parent
DATA = REPO / "src" / "data" / "software.yml"

USER_AGENT = "greglucas.github.io (+https://greglucas.github.io)"
API = "https://zenodo.org/api/records"

# Fields this script owns. Any of these already present are replaced.
GENERATED = ("version", "version_doi", "released")


def die(msg: str) -> NoReturn:
    print(f"error: {msg}", file=sys.stderr)
    sys.exit(1)


def latest_release(concept_doi: str) -> dict | None:
    """Resolve a concept DOI to metadata for its most recent version."""
    params = urllib.parse.urlencode(
        {"q": f'conceptdoi:"{concept_doi}"', "size": "1", "sort": "mostrecent", "all_versions": "1"}
    )
    req = urllib.request.Request(f"{API}?{params}", headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=45) as resp:
            payload = json.load(resp)
    except urllib.error.HTTPError as e:
        die(f"Zenodo request failed for {concept_doi} ({e.code} {e.reason})")
    except urllib.error.URLError as e:
        die(f"could not reach Zenodo: {e.reason}")

    hits = payload.get("hits", {}).get("hits") or []
    if not hits:
        return None

    hit = hits[0]
    md = hit.get("metadata", {})
    version = (md.get("version") or "").lstrip("vV")
    return {
        "version": version or None,
        "version_doi": hit.get("doi"),
        "released": (md.get("publication_date") or "")[:10] or None,
    }


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--dry-run", action="store_true", help="report changes without writing")
    args = ap.parse_args()

    if not DATA.exists():
        die(f"{DATA} not found")
    lines = DATA.read_text().splitlines()

    concept_dois = re.findall(r"^\s*zenodo_concept_doi:\s*(\S+)\s*$", "\n".join(lines), re.M)
    if not concept_dois:
        die("no zenodo_concept_doi entries found in software.yml")

    resolved: dict[str, dict | None] = {}
    for doi in concept_dois:
        resolved[doi] = latest_release(doi)

    out: list[str] = []
    changes: list[tuple[str, str | None, str | None]] = []
    i = 0
    while i < len(lines):
        line = lines[i]
        out.append(line)

        m = re.match(r"^(\s*)zenodo_concept_doi:\s*(\S+)\s*$", line)
        if not m:
            i += 1
            continue

        indent, doi = m.group(1), m.group(2)

        # Consume any generated lines already following this key so they are
        # replaced rather than accumulating.
        old_version = None
        j = i + 1
        while j < len(lines):
            gm = re.match(rf"^{indent}({'|'.join(GENERATED)}):\s*(.*)$", lines[j])
            if not gm:
                break
            if gm.group(1) == "version":
                old_version = gm.group(2).strip() or None
            j += 1

        info = resolved.get(doi)
        if info:
            for field in GENERATED:
                value = info.get(field)
                if value:
                    out.append(f"{indent}{field}: {value}")
            if old_version != info.get("version"):
                changes.append((doi, old_version, info.get("version")))
        else:
            print(f"note: no Zenodo record found for {doi}", file=sys.stderr)

        i = j

    if not changes:
        print(f"Zenodo metadata already up to date ({len(concept_dois)} packages).")
        return

    print(f"{len(changes)} package version(s) changed:\n")
    for doi, old, new in changes:
        print(f"  {doi:<28} {str(old or '-'):>10} -> {new}")
    print()

    if args.dry_run:
        print("Dry run; no changes written.")
        return

    DATA.write_text("\n".join(out) + "\n")
    print(f"Updated {DATA.relative_to(REPO)}.")


if __name__ == "__main__":
    main()
