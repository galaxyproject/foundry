import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { buildNoteSchema } from '@galaxy-foundry/note-schema';
import { licensePolicy, referenceContract, tags } from './lib/registries';

// The frontmatter contract is the single zod schema from @galaxy-foundry/note-schema,
// built from the same registries the validator uses. There is no site-local schema
// to keep in lockstep — the former hand-written mirror is gone.
const noteSchema = buildNoteSchema({ tags, contract: referenceContract, licensePolicy });

function slugifyPath(entry: string): string {
  return entry.replace(/\.md$/, '').split('/')
    .map(s => s.toLowerCase().replace(/\s+-\s+/g, '-').replace(/\s+/g, '-')
      .replace(/[^a-z0-9\-]/g, '').replace(/-+/g, '-'))
    .join('/');
}

const content = defineCollection({
  loader: glob({
    pattern: [
      'cli/**/*.md',
      'molds/**/index.md',
      'patterns/**/*.md',
      'source-patterns/**/*.md',
      'pipelines/**/index.md',
      'research/**/*.md',
      'schemas/**/*.md',
      '!Dashboard.md',
      '!Index.md',
      '!log.md',
      '!meta/glossary.md',
    ],
    base: '../content',
    generateId({ entry }) {
      let id = slugifyPath(entry);
      if (id.endsWith('/index')) id = id.slice(0, -'/index'.length);
      return id;
    },
  }),
  schema: noteSchema,
});

export const collections = { content };
