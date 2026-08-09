#!/usr/bin/env python3
"""Add a publication to src/data/publications.yml from its DOI.

Pulls title, authors, venue, volume, issue, pages and year from the Crossref
API so the entry matches the publisher of record, then inserts it in the right
place in the file (grouped by type, newest first).

Usage:
    python3 scripts/add_pub.py 10.1029/2019SW002329
    python3 scripts/add_pub.py https://doi.org/10.1029/2019SW002329
    python3 scripts/add_pub.py 10.1029/2019SW002329 --type poster
    python3 scripts/add_pub.py 10.1029/2019SW002329 --dry-run

Requires no third-party packages: only the standard library.
"""

from __future__ import annotations

import argparse
import html
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

# Crossref asks for a contact address so they can reach you about heavy usage;
# it also gets requests routed to their faster "polite" pool.
MAILTO = "greg.m.lucas@gmail.com"
USER_AGENT = f"greglucas.github.io (+https://greglucas.github.io; mailto:{MAILTO})"

VALID_TYPES = ["journal", "chapter", "thesis", "report", "conference", "poster"]

# Field order must match the rest of the file so diffs stay readable.
FIELD_ORDER = [
    "venue", "book", "institution", "meeting", "volume", "issue",
    "pages", "article", "number", "doi", "url",
]

# Crossref occasionally has mangled name records; correct them on the way in.
AUTHOR_OVERRIDES = {"G. Baumgaertner": "Baumgaertner, A. J. G."}

# Crossref work types that map to something other than a journal article.
TYPE_MAP = {
    "book-chapter": "chapter",
    "posted-content": "poster",
    "proceedings-article": "conference",
    "report": "report",
    "dissertation": "thesis",
}


def die(msg: str) -> NoReturn:
    print(f"error: {msg}", file=sys.stderr)
    sys.exit(1)


def normalize_doi(raw: str) -> str:
    """Accept a bare DOI, a doi.org URL, or a 'doi:' prefixed string."""
    doi = raw.strip()
    doi = re.sub(r"^https?://(dx\.)?doi\.org/", "", doi, flags=re.I)
    doi = re.sub(r"^doi:\s*", "", doi, flags=re.I)
    if not re.match(r"^10\.\d{4,9}/\S+$", doi):
        die(f"{raw!r} does not look like a DOI (expected something like 10.1029/2019SW002329)")
    return doi


def fetch(doi: str) -> dict:
    url = f"https://api.crossref.org/works/{urllib.parse.quote(doi, safe='')}"
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.load(resp)["message"]
    except urllib.error.HTTPError as e:
        if e.code == 404:
            die(f"Crossref has no record for {doi}")
        die(f"Crossref request failed ({e.code} {e.reason})")
    except urllib.error.URLError as e:
        die(f"could not reach Crossref: {e.reason}")


def initials(given: str | None) -> str:
    parts = re.split(r"[\s.]+", (given or "").strip())
    return " ".join(p[0].upper() + "." for p in parts if p)


def format_author(a: dict) -> str:
    family = a.get("family", "").strip()
    if family in AUTHOR_OVERRIDES:
        return AUTHOR_OVERRIDES[family]
    if not family:
        return a.get("name", "").strip() or "Unknown"
    ini = initials(a.get("given"))
    return f"{family}, {ini}" if ini else family


def clean(s: str) -> str:
    """Normalize a Crossref string for use as plain text.

    Crossref titles may contain inline markup (<i>L</i>, <sub>, <scp>) and HTML
    entities, and AGU records use non-breaking hyphens throughout. The site
    renders these fields as text, so anything left in would show up literally.
    """
    s = re.sub(r"<[^>]+>", "", s)
    s = html.unescape(s)
    s = s.replace("‐", "-").replace("‑", "-").replace("–", "-")
    return re.sub(r"\s+", " ", s).strip()


def yaml_scalar(value, force_quote: bool = False) -> str:
    s = str(value)
    needs_quote = force_quote or bool(
        re.search(r'^[\s>|&*#!%@`\[\]{},"\']|[:#]\s|\s$|^$', s)
    ) or s.lower() in ("true", "false", "null", "yes", "no", "on", "off")
    if needs_quote:
        return '"' + s.replace("\\", "\\\\").replace('"', '\\"') + '"'
    return s


def build_entry(msg: dict, doi: str, pub_type: str | None) -> dict:
    if pub_type is None:
        pub_type = TYPE_MAP.get(msg.get("type", ""), "journal")

    date_parts = (msg.get("issued", {}).get("date-parts") or [[None]])[0]
    year = date_parts[0] if date_parts else None
    if not year:
        die(f"Crossref record for {doi} has no publication year; add the entry by hand")

    entry = {
        "type": pub_type,
        "title": clean((msg.get("title") or [""])[0]),
        "authors": [format_author(a) for a in (msg.get("author") or [])],
        "year": int(year),
        "venue": clean((msg.get("container-title") or [""])[0]) or None,
        "volume": msg.get("volume"),
        "issue": msg.get("issue"),
        "pages": clean(msg.get("page") or "") or None,
        "doi": doi,
    }

    article = msg.get("article-number")
    # Skip AGU-style "e2024SW004046" article ids, which just repeat the DOI.
    if article and not re.match(r"^e\d", article):
        entry["article"] = article

    if not entry["title"]:
        die(f"Crossref record for {doi} has no title; add the entry by hand")
    if not entry["authors"]:
        die(f"Crossref record for {doi} has no authors; add the entry by hand")

    return entry


def render(entry: dict) -> str:
    lines = [f"- type: {entry['type']}", f"  title: {yaml_scalar(entry['title'])}", "  authors:"]
    lines += [f"    - {yaml_scalar(a)}" for a in entry["authors"]]
    lines.append(f"  year: {entry['year']}")
    for key in FIELD_ORDER:
        val = entry.get(key)
        if val is None or val == "":
            continue
        # `number` is a document identifier; always quote so an all-digit value
        # is not read back as a YAML integer.
        lines.append(f"  {key}: {yaml_scalar(val, force_quote=(key == 'number'))}")
    return "\n".join(lines)


def split_blocks(text: str) -> tuple[str, list[str]]:
    """Split the file into its leading comment header and a list of entry blocks."""
    lines = text.splitlines()
    start = next((i for i, l in enumerate(lines) if l.startswith("- ")), len(lines))
    header = "\n".join(lines[:start]).rstrip("\n")

    blocks: list[str] = []
    current: list[str] = []
    for line in lines[start:]:
        if line.startswith("- ") and current:
            blocks.append("\n".join(current).rstrip())
            current = [line]
        else:
            current.append(line)
    if current:
        tail = "\n".join(current).rstrip()
        if tail:
            blocks.append(tail)
    return header, blocks


def block_field(block: str, name: str) -> str | None:
    """Read a top-level field out of an entry block.

    The first line of a block starts with the list marker ("- type: journal")
    while the rest are indented two spaces, so both forms have to match.
    """
    m = re.search(rf"^(?:- |  ){name}:\s*(.+)$", block, re.M)
    if not m:
        return None
    return m.group(1).strip().strip('"')


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("doi", help="DOI, optionally as a doi.org URL")
    p.add_argument("--type", choices=VALID_TYPES, default=None,
                   help="publication type (inferred from Crossref when omitted)")
    p.add_argument("--dry-run", action="store_true", help="print the entry without writing")
    args = p.parse_args()

    doi = normalize_doi(args.doi)

    if not PUBS.exists():
        die(f"{PUBS} not found")
    text = PUBS.read_text()

    if re.search(rf"^  doi:\s*{re.escape(doi)}\s*$", text, re.M | re.I):
        die(f"{doi} is already in {PUBS.relative_to(REPO)}")

    print(f"Fetching {doi} from Crossref...", file=sys.stderr)
    entry = build_entry(fetch(doi), doi, args.type)
    block = render(entry)

    if args.dry_run:
        print(block)
        return

    header, blocks = split_blocks(text)

    # Insert after the last entry of the same type with a year >= this one, so
    # the file stays grouped by type and newest-first within each group.
    same_type = [i for i, b in enumerate(blocks) if block_field(b, "type") == entry["type"]]
    if not same_type:
        insert_at = len(blocks)
    else:
        insert_at = same_type[-1] + 1
        for i in same_type:
            try:
                year = int(block_field(blocks[i], "year") or 0)
            except ValueError:
                continue
            if year < entry["year"]:
                insert_at = i
                break

    blocks.insert(insert_at, block)
    PUBS.write_text(header + "\n\n" + "\n\n".join(blocks) + "\n")

    authors = ", ".join(entry["authors"][:3]) + (" et al." if len(entry["authors"]) > 3 else "")
    print(f"\nAdded to {PUBS.relative_to(REPO)} as entry {insert_at + 1} of {len(blocks)}:\n")
    print(f"  {entry['title']}")
    print(f"  {authors} ({entry['year']})")
    if entry.get("venue"):
        print(f"  {entry['venue']}")
    print(f"\nReview the entry, then run `npm run build` to validate it.")


if __name__ == "__main__":
    main()
