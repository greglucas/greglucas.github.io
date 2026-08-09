import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { toBibtexFile } from '../lib/bibtex';

/**
 * The whole publication list as a downloadable .bib file, generated from the
 * same data the HTML page renders so the two can never disagree.
 */
export const GET: APIRoute = async () => {
  const pubs = (await getCollection('publications')).map((e) => e.data);
  const generatedOn = new Date().toISOString().slice(0, 10);

  return new Response(toBibtexFile(pubs, generatedOn), {
    headers: {
      'Content-Type': 'application/x-bibtex; charset=utf-8',
      'Content-Disposition': 'inline; filename="lucas-publications.bib"',
    },
  });
};
