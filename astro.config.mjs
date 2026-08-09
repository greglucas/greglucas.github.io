// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://greglucas.github.io',
  integrations: [sitemap()],
  // GitHub Pages serves this as a user site at the domain root, so no `base`.
  trailingSlash: 'ignore',
  build: {
    // Emit /publications.html style routes as /publications/index.html so the
    // URLs the old Angular router used keep working.
    format: 'directory',
  },
});
