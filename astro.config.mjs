// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://greglucas.github.io',
  integrations: [sitemap()],
  // Astro's HTML compressor collapses the newline between a line of prose and
  // an <a> that starts the following line, deleting the space entirely so it
  // renders "that work appears inAtmospheric Chemistry". Keeping the source
  // whitespace costs a few KB and removes a whole class of typo at the root.
  compressHTML: false,
  // GitHub Pages serves this as a user site at the domain root, so no `base`.
  trailingSlash: 'ignore',
  build: {
    // Emit /publications.html style routes as /publications/index.html so the
    // URLs the old Angular router used keep working.
    format: 'directory',
  },
});
