#!/usr/bin/env python3
"""Check every link in the built site.

Internal links are resolved against dist/ and are hard failures: a broken one
means a page on this site points at nothing.

External links are reported but do not fail the build by default. Sites go down
for reasons that have nothing to do with this repository, and a personal site
should not become unpublishable because someone else's server is having a bad
morning. Use --strict-external in a scheduled job if you want to be told loudly.

Usage:
    python3 scripts/check_links.py                  # internal only (fast, offline)
    python3 scripts/check_links.py --external       # also check outbound links
    python3 scripts/check_links.py --external --strict-external
"""

from __future__ import annotations

import argparse
import concurrent.futures
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

DIST = Path(__file__).resolve().parent.parent / "dist"
UA = "Mozilla/5.0 (compatible; greglucas.github.io link checker)"

# Hosts that reliably refuse automated requests but are fine in a browser.
# LinkedIn answers bots with HTTP 999; several publishers return 403.
SKIP_HOSTS = ("linkedin.com", "www.linkedin.com")

# Codes that mean "reachable, but not for a bot".
SOFT_OK = {401, 403, 429, 999}


def collect() -> tuple[set[str], set[str], dict[str, set[str]]]:
    internal: set[str] = set()
    external: set[str] = set()
    where: dict[str, set[str]] = {}

    for page in DIST.rglob("*.html"):
        html = page.read_text()
        src = "/" + str(page.relative_to(DIST))
        for m in re.finditer(r'(?:href|src)="([^"]+)"', html):
            url = m.group(1)
            if url.startswith(("mailto:", "tel:", "data:", "#", "javascript:")):
                continue
            (external if url.startswith(("http://", "https://")) else internal).add(url)
            where.setdefault(url, set()).add(src)

    return internal, external, where


def internal_ok(url: str) -> bool:
    path = url.split("#")[0].split("?")[0]
    if not path.startswith("/"):
        return True  # relative links are rare here; skip rather than guess
    rel = path.lstrip("/")
    if path.endswith("/") or "." not in Path(rel).name:
        return (DIST / rel / "index.html").exists() or (DIST / (rel + ".html")).exists() or rel == ""
    return (DIST / rel).exists()


def external_status(url: str) -> tuple[str, int | str]:
    if any(h in url for h in SKIP_HOSTS):
        return url, "skipped"
    req = urllib.request.Request(url, headers={"User-Agent": UA}, method="HEAD")
    try:
        with urllib.request.urlopen(req, timeout=25) as r:
            return url, r.status
    except urllib.error.HTTPError as e:
        if e.code in (405, 501):  # HEAD unsupported; retry with GET
            try:
                req = urllib.request.Request(url, headers={"User-Agent": UA})
                with urllib.request.urlopen(req, timeout=25) as r:
                    return url, r.status
            except Exception as e2:  # noqa: BLE001
                return url, getattr(e2, "code", type(e2).__name__)
        return url, e.code
    except Exception as e:  # noqa: BLE001
        return url, type(e).__name__


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--external", action="store_true", help="also check outbound links")
    ap.add_argument("--strict-external", action="store_true", help="fail on broken outbound links")
    args = ap.parse_args()

    if not DIST.exists():
        sys.exit("error: dist/ not found - run `npm run build` first")

    internal, external, where = collect()
    failed = False

    broken = sorted(u for u in internal if not internal_ok(u))
    print(f"internal links: {len(internal)} checked, {len(broken)} broken")
    for u in broken:
        print(f"  BROKEN {u}\n         on {', '.join(sorted(where[u]))}")
        failed = True

    if args.external:
        print(f"\nexternal links: {len(external)} to check")
        with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
            results = list(pool.map(external_status, sorted(external)))

        bad = []
        for url, status in results:
            if status == "skipped" or status == 200 or status in SOFT_OK:
                continue
            bad.append((url, status))

        print(f"  {len(bad)} not reachable")
        for url, status in sorted(bad, key=lambda r: str(r[1])):
            print(f"  {status:<14} {url}")
            print(f"  {'':14} on {', '.join(sorted(where[url]))}")
        if bad and args.strict_external:
            failed = True

    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
