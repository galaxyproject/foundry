import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import {
  COLLECTIONS,
  CONTENT_DIR,
  buildKindSchemas,
  type CollectionName,
} from '@galaxy-foundry/note-schema';
import { licensePolicy, referenceContract, tags } from './lib/registries';

// One collection per kind, routed by path. The directory a note lives in picks the schema it
// parses against; the `type:` literal in that schema asserts the note agrees, so location is a
// CHECKED assumption rather than an inference.
//
// Bases and globs both come from COLLECTIONS in the shared package, which the validator's walk
// routes from too — one table, so a directory the site publishes and a directory the validator
// checks cannot drift apart. They had: `content/prompts/**` was walked by the validator and
// globbed by nothing, so the prompt kind was validated on every run and published by nothing.
const schemas = buildKindSchemas({ tags, contract: referenceContract, licensePolicy });

function slugifyPath(entry: string): string {
  return entry.replace(/\.md$/, '').split('/')
    .map(s => s.toLowerCase().replace(/\s+-\s+/g, '-').replace(/\s+/g, '-')
      .replace(/[^a-z0-9\-]/g, '').replace(/-+/g, '-'))
    .join('/');
}

// Entry ids stay exactly what the single `content` collection produced: the slugified path
// relative to content/, with `/index` stripped. A per-collection loader sees paths relative to
// its OWN base, so the base's path has to go back on before slugifying — without it every note
// loses its leading segment and every URL on the site moves.
//
// The old glob's `!Dashboard.md` / `!Index.md` / `!log.md` / `!meta/glossary.md` exclusions are
// gone rather than dropped: those files sit at content/ root and in content/meta/, and no
// collection's base reaches them.
function load(name: CollectionName) {
  const { base, pattern } = COLLECTIONS[name];
  const prefix = base.slice(`${CONTENT_DIR}/`.length);
  return glob({
    pattern: [...pattern],
    base: `../${base}`,
    generateId({ entry }) {
      const id = slugifyPath(`${prefix}/${entry}`);
      return id.endsWith('/index') ? id.slice(0, -'/index'.length) : id;
    },
  });
}

// Written out per collection rather than mapped over COLLECTIONS. A loop produces one
// homogeneous collection type and every kind's frontmatter collapses to the widest common
// shape — which is how `entry.data` degrades to `unknown` on the pages. Naming each schema
// keeps each collection's type precise.
export const collections = {
  molds: defineCollection({ loader: load('molds'), schema: schemas.mold }),
  patterns: defineCollection({ loader: load('patterns'), schema: schemas.pattern }),
  'source-patterns': defineCollection({
    loader: load('source-patterns'),
    schema: schemas['source-pattern'],
  }),
  'cli-tools': defineCollection({ loader: load('cli-tools'), schema: schemas['cli-tool'] }),
  'cli-commands': defineCollection({
    loader: load('cli-commands'),
    schema: schemas['cli-command'],
  }),
  pipelines: defineCollection({ loader: load('pipelines'), schema: schemas.pipeline }),
  research: defineCollection({ loader: load('research'), schema: schemas.research }),
  schemas: defineCollection({ loader: load('schemas'), schema: schemas.schema }),
  prompts: defineCollection({ loader: load('prompts'), schema: schemas.prompt }),
};
