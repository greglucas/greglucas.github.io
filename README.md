# greglucas.github.io

Personal site for Greg M. Lucas, built with [Astro](https://astro.build) and
deployed to GitHub Pages by GitHub Actions.

## Running it

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # static output in dist/
npm run preview    # serve the built output
```

Node 20 or newer. Python 3.9+ is only needed for the two maintenance scripts.

## Adding a publication

**Do not hand-edit `src/data/publications.yml` for anything with a DOI.** Run:

```bash
python3 scripts/add_pub.py 10.1029/2019SW002329
```

This pulls the title, authors, venue, volume, issue, pages and year from
Crossref, so the entry matches the publisher of record rather than whatever got
typed. It inserts the entry into the correct type group at the correct position
by year.

```bash
python3 scripts/add_pub.py <doi> --dry-run          # preview without writing
python3 scripts/add_pub.py <doi> --type poster      # override inferred type
```

It accepts a bare DOI, a `https://doi.org/...` URL, or a `doi:`-prefixed
string, and refuses to add a DOI that is already present.

For entries with **no** DOI — older conference papers, reports, some posters —
add them to `src/data/publications.yml` by hand. The comment block at the top of
that file lists every available field.

After adding anything, run `npm run build`. The schema in
`src/content.config.ts` validates every entry, so a mistyped field name, a
missing required field or a bad DOI format fails the build instead of quietly
rendering wrong.

## Software and Zenodo DOIs

`src/data/software.yml` drives the /software page. Each archived package carries
a **concept DOI** — the Zenodo DOI that always resolves to the latest release,
which is the one people should cite. Set that by hand once; the `version`,
`version_doi` and `released` fields under it are generated:

```bash
python3 scripts/update_zenodo.py             # refresh from Zenodo
python3 scripts/update_zenodo.py --dry-run   # show what would change
```

Packages with no Zenodo archive just omit `zenodo_concept_doi` and render
without a DOI. To add one, enable the Zenodo integration on the GitHub repo and
cut a release, then paste the concept DOI here.

## Citation counts

`citations` and `citations_updated` in `publications.yml` are generated. Do not
edit them by hand.

```bash
python3 scripts/update_citations.py             # fetch and write
python3 scripts/update_citations.py --dry-run   # show what would change
```

Counts come from [OpenAlex](https://openalex.org), which is fully open and needs
no API key. `.github/workflows/citations.yml` runs this and the Zenodo refresh
every Monday, and commits only if something changed.

These numbers will be lower than Google Scholar's. Scholar indexes a broader and
less curated set of sources, and has no API and blocks scraping, so it cannot be
used as the source here. The publications page says so on the page itself.

## Checking links

```bash
npm run build
python3 scripts/check_links.py              # internal links only, offline
python3 scripts/check_links.py --external   # also check outbound links
```

Internal links are checked on every deploy and a broken one fails the build.
Outbound links are checked monthly by `.github/workflows/links.yml`, which
reports but does not fail — a dead external site is worth knowing about, but
not worth making this site unpublishable over.

## Layout

```
src/
  content.config.ts        Zod schema for publications; validated at build time
  data/publications.yml    Single source of truth for the publications page
  data/software.yml        Software list and Zenodo concept DOIs
  lib/bibtex.ts            Publication -> BibTeX, shared by the page and .bib
  layouts/Base.astro       HTML shell: SEO, Open Graph, JSON-LD, theme, analytics
  components/              Nav, Footer, Publication (one citation entry)
  pages/                   One file per route
  styles/global.css        Design tokens and shared styles; no CSS framework
public/                    Served verbatim at the site root (images, resume PDF)
scripts/                   add_pub.py, update_citations.py, update_zenodo.py,
                           check_links.py (all standard library only)
```

Pages are plain `.astro` files. Content that repeats — the experience timeline,
the software lists, the research cards — is defined as an array at the top of
its page and rendered in a loop, so adding an item means editing a list rather
than copying markup.

## Deployment

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds and
publishes to Pages. `deploy.yml` also runs on a schedule an hour after the
citation refresh, because pushes made with `GITHUB_TOKEN` deliberately do not
trigger other workflows.

> **One-time setup:** repository Settings → Pages → Build and deployment →
> Source must be set to **GitHub Actions**. While it is set to "Deploy from a
> branch" the workflow will build successfully and publish nothing.

## Notes

- The site ships no JavaScript framework. The only client-side scripts are the
  theme toggle, the GA4 snippet, and the 404 page's redirect map for the old
  Angular URLs.
- Dark mode follows the OS by default and can be overridden with the toggle in
  the nav; the choice persists in `localStorage`.
- `/publications.bib` serves the whole list as BibTeX, generated from the same
  YAML the HTML page renders. Cite keys are assigned across the full list so
  they are unique, and a key copied from the page matches the downloaded file.
- Featured publications are marked with `featured` (rank) and `impact` (why) in
  `publications.yml`; the schema rejects one without the other.
- Old nested URLs (`/research/GEC/conductivity` and friends) are redirected by
  `src/pages/404.astro` to the corresponding anchor on
  `/research/global-electric-circuit`.
