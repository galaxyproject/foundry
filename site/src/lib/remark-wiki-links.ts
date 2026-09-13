import {
  collectionPrefix,
  GALAXY_SLUG_ALIASES,
  readGalaxyContent,
} from '@galaxy-foundry/gxwf-foundry-note-schema';
import { remarkContentWikiLinks, type ContentTarget } from '@galaxy-foundry/content-reader';
import type { Root } from 'mdast';

// Body prose runs at markdown-compile time, before astro:content exists, so this side reads the
// filesystem. That used to mean its OWN walk, its own frontmatter parser and its own skip lists —
// sixty lines answering a question the validator already answered, and answering it differently:
// the walk keyed notes by basename alone, so `[[gxwf validate]]` resolved for the validator and
// rendered bold on the page.
//
// Now the walk, the addressing rule and the vocabulary all arrive from the same two packages the
// validator reads, and the only thing stated here is where a note's page lives. See
// content/meta/architecture.md §7.

interface Options {
  contentDir: string;
  base: string;
}

/**
 * A note's page: the directory it publishes under, then its collection-relative id.
 *
 * `collectionPrefix` and not the collection name — `cli-tools` and `cli-commands` both publish
 * under `cli/`, which is also how the ids the catch-all route generates are spelled.
 */
const targetOf = (collection: Parameters<typeof collectionPrefix>[0], id: string, meta: Record<string, unknown>): ContentTarget => ({
  path: `${collectionPrefix(collection)}/${id}`,
  ...(typeof meta.summary === 'string' ? { title: meta.summary } : {}),
});

function buildMap(contentDir: string): ReadonlyMap<string, ContentTarget> {
  const index = readGalaxyContent(contentDir, GALAXY_SLUG_ALIASES, targetOf);
  return new Map([...index.notesByAddress].map(([address, note]) => [address, note.target]));
}

export default function remarkWikiLinksPlugin(opts: Options) {
  let cache: ReadonlyMap<string, ContentTarget> | null = null;
  const baseTrim = opts.base.replace(/\/$/, '');

  return function transformer(tree: Root) {
    remarkContentWikiLinks((cache ??= buildMap(opts.contentDir)), baseTrim)(tree as never);
  };
}
