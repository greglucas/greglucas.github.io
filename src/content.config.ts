import { defineCollection, z } from 'astro:content';
import { file } from 'astro/loaders';
import { parse } from 'yaml';

/**
 * Publication types, in the order they are rendered on /publications.
 */
export const PUB_TYPES = [
  'journal',
  'chapter',
  'thesis',
  'report',
  'conference',
  'poster',
] as const;

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 70);

const publications = defineCollection({
  loader: file('src/data/publications.yml', {
    parser: (text) => {
      const parsed = parse(text);
      if (!Array.isArray(parsed)) {
        throw new Error('publications.yml must contain a top-level list of entries.');
      }
      // A DOI is the natural stable id. Entries without one (reports, posters,
      // older conference papers) fall back to a title slug plus year, with a
      // numeric suffix if that still collides — two of the Sandia reports have
      // titles identical up to the slug length limit, and a duplicate id would
      // silently drop one of them.
      const seen = new Map<string, number>();
      return parsed.map((entry, i) => {
        let id: string = entry?.doi ?? `${slugify(entry?.title ?? '')}-${entry?.year ?? i}`;
        const count = seen.get(id) ?? 0;
        seen.set(id, count + 1);
        if (count > 0) id = `${id}-${count + 1}`;
        return { id, ...entry };
      });
    },
  }),
  schema: z.object({
    type: z.enum(PUB_TYPES),
    title: z.string().min(1),
    authors: z.array(z.string().min(1)).min(1),
    year: z.number().int().min(1990).max(2100),

    /** Journal, book series, or conference name. */
    venue: z.string().optional(),
    volume: z.union([z.string(), z.number()]).optional(),
    issue: z.union([z.string(), z.number()]).optional(),
    pages: z.string().optional(),
    /** Article number, for journals that use them instead of page ranges. */
    article: z.union([z.string(), z.number()]).optional(),

    doi: z.string().regex(/^10\.\d{4,9}\//, 'Must be a bare DOI, e.g. 10.1029/2019SW002329').optional(),
    /** Used only when there is no DOI to link to. */
    url: z.string().url().optional(),

    /** Book title, for chapters. */
    book: z.string().optional(),
    /** Institution, for theses and reports. */
    institution: z.string().optional(),
    /** Report/document number, e.g. SAND2010-2547. */
    number: z.string().optional(),
    /** Meeting name and location, for conference papers and posters. */
    meeting: z.string().optional(),

    /** Extra links shown beneath an entry. */
    links: z
      .array(z.object({ label: z.string(), href: z.string().url() }))
      .optional(),

    /**
     * Citation count. Refreshed automatically from OpenAlex by
     * scripts/update_citations.py — do not edit by hand.
     */
    citations: z.number().int().nonnegative().optional(),
    citations_updated: z.string().optional(),
  }),
});

export const collections = { publications };
