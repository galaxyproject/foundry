// @ts-check
import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import tailwindcss from '@tailwindcss/vite';
import pagefind from 'astro-pagefind';
import remarkWikiLinks from './src/lib/remark-wiki-links.ts';
import remarkCorpusCitations from './src/lib/remark-corpus-citations.ts';
import remarkVendoredMyst from './src/lib/remark-vendored-myst.ts';

export default defineConfig({
  site: 'https://galaxyproject.github.io',
  base: '/foundry',
  // Astro 7 defaults this to 'jsx', which drops the whitespace between inline elements that
  // sit on their own source lines — badges, tag chips and meta separators all ran together.
  // Pinned to the pre-7 behaviour rather than hand-spacing every component.
  compressHTML: true,
  integrations: [pagefind()],
  // Astro 7 renders markdown with Sätteri by default, which runs no remark plugins at all.
  // `[[wiki-links]]`, corpus citations and vendored MyST are the site's link grammar, so the
  // remark pipeline is opted back into explicitly rather than ported to a Rust plugin API.
  markdown: {
    processor: unified({
      remarkPlugins: [
        [remarkWikiLinks, { contentDir: '../content', base: '/foundry' }],
        [remarkCorpusCitations, { repoRoot: '..' }],
        remarkVendoredMyst,
      ],
    }),
  },
  vite: {
    plugins: [tailwindcss()],
    server: {
      watch: {
        ignored: ['**/.obsidian/**', '**/content/log.md'],
      },
    },
  },
});
