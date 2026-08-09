import type { CollectionEntry } from 'astro:content';

type Pub = CollectionEntry<'publications'>['data'];

/** Publication type -> BibTeX entry type. */
const ENTRY_TYPE: Record<Pub['type'], string> = {
  journal: 'article',
  chapter: 'incollection',
  thesis: 'phdthesis',
  report: 'techreport',
  conference: 'inproceedings',
  poster: 'misc',
};

/**
 * BibTeX is latin1-ish and chokes on the characters that turn up in real
 * author lists and titles. Escape the ones that actually appear here.
 */
function escapeTex(value: string): string {
  return value
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/([&%$#_{}])/g, '\\$1')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}')
    .replace(/é/g, "\\'{e}")
    .replace(/è/g, '\\`{e}')
    .replace(/á/g, "\\'{a}")
    .replace(/í/g, "\\'{i}")
    .replace(/ó/g, "\\'{o}")
    .replace(/ú/g, "\\'{u}")
    .replace(/ñ/g, '\\~{n}')
    .replace(/ü/g, '\\"{u}')
    .replace(/ö/g, '\\"{o}')
    .replace(/ä/g, '\\"{a}')
    .replace(/å/g, '\\aa{}')
    .replace(/ø/g, '\\o{}')
    .replace(/č/g, '\\v{c}')
    .replace(/š/g, '\\v{s}')
    .replace(/ž/g, '\\v{z}')
    .replace(/–/g, '--')
    .replace(/—/g, '---');
}

/**
 * Wrap capitalised words in braces so BibTeX styles that lowercase titles do
 * not turn "Geoelectric Hazards in the U.S." into "geoelectric hazards in the
 * u.s.". Only tokens with a capital past the first character (acronyms,
 * model names, "3-D") plus the leading word need protecting.
 */
function protectTitle(title: string): string {
  return title
    .split(' ')
    .map((word) => (/[A-Z0-9].*[A-Z]|^[A-Z]{2,}/.test(word.replace(/[^\w-]/g, '')) ? `{${word}}` : word))
    .join(' ');
}

/** Surname of the first author, stripped to ASCII letters. */
function firstAuthorKey(authors: string[]): string {
  const family = (authors[0] ?? 'anon').split(',')[0];
  return (
    family
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^A-Za-z]/g, '')
      .toLowerCase() || 'anon'
  );
}

const STOPWORDS = new Set([
  'a', 'an', 'the', 'on', 'in', 'of', 'for', 'and', 'to', 'with', 'is', 'are', 'at', 'from',
]);

/** Stable, human-recognisable cite key: lucas2020geoelectric. */
export function citeKey(pub: Pub): string {
  const word =
    pub.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .split(/[\s-]+/)
      .find((w) => w.length > 3 && !STOPWORDS.has(w)) ?? 'untitled';
  return `${firstAuthorKey(pub.authors)}${pub.year}${word}`;
}

/** Identity used to look a publication up in the cite-key map. */
export function pubId(pub: Pub): string {
  return pub.doi ?? `${pub.title}|${pub.year}`;
}

/**
 * Assign a unique cite key to every publication.
 *
 * The naive key collides in real data — Love et al. published two "Geoelectric
 * Hazard Maps for ..." papers in 2018, and the two Sandia reports share a title
 * prefix and a year. Duplicate keys make a .bib file invalid, so collisions get
 * the usual a/b/c suffix. Keys are assigned over the full list in display order
 * so they stay stable as long as the surrounding entries do.
 */
export function assignCiteKeys(pubs: Pub[]): Map<string, string> {
  const ordered = [...pubs].sort((a, b) => b.year - a.year || a.title.localeCompare(b.title));

  const counts = new Map<string, number>();
  for (const pub of ordered) {
    const base = citeKey(pub);
    counts.set(base, (counts.get(base) ?? 0) + 1);
  }

  const used = new Map<string, number>();
  const keys = new Map<string, string>();
  for (const pub of ordered) {
    const base = citeKey(pub);
    if ((counts.get(base) ?? 0) > 1) {
      const n = used.get(base) ?? 0;
      used.set(base, n + 1);
      keys.set(pubId(pub), `${base}${String.fromCharCode(97 + n)}`);
    } else {
      keys.set(pubId(pub), base);
    }
  }
  return keys;
}

/**
 * Render one publication as a BibTeX entry.
 *
 * Authors are stored as "Family, I. I." which is already BibTeX's preferred
 * form, so they only need joining with " and ".
 */
export function toBibtex(pub: Pub, key: string = citeKey(pub)): string {
  // "et al." is not a person. BibTeX's own idiom for an elided author list is
  // the literal name `others`, which styles render back as "et al.".
  const authors = pub.authors.map((a) => (/^et\.? ?al\.?$/i.test(a.trim()) ? 'others' : escapeTex(a)));

  const fields: [string, string][] = [
    ['author', authors.join(' and ')],
    ['title', protectTitle(escapeTex(pub.title))],
    ['year', String(pub.year)],
  ];

  if (pub.type === 'chapter' && pub.book) {
    fields.push(['booktitle', escapeTex(pub.book)]);
    if (pub.venue) fields.push(['series', escapeTex(pub.venue)]);
  } else if (pub.type === 'conference') {
    if (pub.meeting) fields.push(['booktitle', escapeTex(pub.meeting)]);
  } else if (pub.type === 'poster') {
    // @misc has no booktitle; howpublished is the conventional slot.
    if (pub.meeting) fields.push(['howpublished', escapeTex(`Poster, ${pub.meeting}`)]);
  } else if (pub.type === 'thesis') {
    // @phdthesis takes school, not journal. The venue here is the publisher of
    // record (ProQuest), which belongs in note alongside the document number.
    if (pub.venue) fields.push(['publisher', escapeTex(pub.venue)]);
  } else if (pub.type === 'report') {
    if (pub.venue) fields.push(['institution', escapeTex(pub.venue)]);
  } else if (pub.venue) {
    fields.push(['journal', escapeTex(pub.venue)]);
  }

  // school belongs to @phdthesis; @techreport wants institution.
  if (pub.institution) {
    fields.push([pub.type === 'thesis' ? 'school' : 'institution', escapeTex(pub.institution)]);
  }
  if (pub.volume !== undefined) fields.push(['volume', String(pub.volume)]);
  if (pub.issue !== undefined) fields.push(['number', String(pub.issue)]);
  if (pub.pages) fields.push(['pages', pub.pages.replace('-', '--')]);
  if (pub.article !== undefined) fields.push(['articleno', String(pub.article)]);
  if (pub.number) fields.push(['note', escapeTex(pub.number)]);
  if (pub.doi) {
    fields.push(['doi', pub.doi]);
    fields.push(['url', `https://doi.org/${pub.doi}`]);
  } else if (pub.url) {
    fields.push(['url', pub.url]);
  }

  const width = Math.max(...fields.map(([k]) => k.length));
  const body = fields
    .map(([k, v]) => `  ${k.padEnd(width)} = {${v}}`)
    .join(',\n');

  return `@${ENTRY_TYPE[pub.type]}{${key},\n${body}\n}`;
}

/** Render a whole list, newest first, with a short header. */
export function toBibtexFile(pubs: Pub[], generatedOn: string): string {
  const sorted = [...pubs].sort((a, b) => b.year - a.year || a.title.localeCompare(b.title));
  const keys = assignCiteKeys(pubs);
  const header = [
    '% Publications of Greg M. Lucas',
    '% https://greglucas.github.io/publications',
    `% Generated ${generatedOn} from src/data/publications.yml.`,
    '% Metadata for entries with a DOI comes from Crossref.',
    '',
  ].join('\n');
  return `${header}\n${sorted.map((p) => toBibtex(p, keys.get(pubId(p)))).join('\n\n')}\n`;
}
