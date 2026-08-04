// The whole corpus, for the pages that genuinely want every kind at once.
//
// Notes live in one collection per kind, so a per-kind page asks for its own collection and
// gets precise frontmatter with no narrowing. But much of this site is cross-kind by
// construction — tags, licenses, the dashboard, the glossary, the catch-all note route, and
// the wiki-link/backlink/artifact graphs all range over everything. `getAllNotes` is what they
// ask instead, and `NoteEntry` is the union they get.
//
// This is the direction that stays cheap. Assembling the union from per-kind collections is
// one function; recovering per-kind precision from a single mixed collection would be a
// narrowing call at every use site.

import { getCollection, type CollectionEntry } from 'astro:content';
import type { CollectionName } from '@galaxy-foundry/note-schema';

/**
 * Every collection holding notes. Mirrors COLLECTIONS in @galaxy-foundry/note-schema.
 *
 * The ORDER is load-bearing and matches the glob pattern order the single `content` collection
 * used. `buildWikiLinkMap` keys by basename and overwrites, so when two notes share a basename
 * the last one walked wins — and exactly one pair does: `cli/foundry/summarize-nextflow.md` and
 * `molds/summarize-nextflow/index.md`. Listing the cli collections first keeps the mold winning
 * `[[summarize-nextflow]]`, as it has been.
 *
 * That the corpus can contain an ambiguous slug at all is a real problem, but it is this
 * module's job to not silently change the answer, not to pick a different one.
 */
export const NOTE_COLLECTIONS = [
  'meta',
  'cli-tools',
  'cli-commands',
  'molds',
  'patterns',
  'source-patterns',
  'pipelines',
  'research',
  'schemas',
  'prompts',
] as const;

export type NoteCollection = (typeof NOTE_COLLECTIONS)[number];

// This list exists separately from COLLECTIONS only because its ORDER is load-bearing (see
// above) and COLLECTIONS is keyed for lookup, not iteration. Separate means it can drift, so
// the two are proved to name the same collections at compile time: a collection added to the
// package and forgotten here would otherwise just quietly stop being published.
// `false`, not `never`, on mismatch: `never extends true` is TRUE, so a `never` here would
// satisfy MustBeTrue and the whole guard would pass vacuously.
type SameSet<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type MustBeTrue<T extends true> = T;
export type _CollectionsCovered = MustBeTrue<SameSet<NoteCollection, CollectionName>>;

/** A note of any kind — the union `entry.data` resolves to for a cross-kind consumer. */
export type NoteEntry = CollectionEntry<NoteCollection>;

/**
 * A note of ONE kind — what a component that renders that kind takes.
 *
 * `NoteEntry` is for readers that genuinely range over the corpus: the tag pages, the dashboard,
 * the link graphs. A component that draws a Mold's phases is not one of those, and taking the
 * union there costs twice. It accepts a note of any kind, so nothing checks that the route handed
 * it the one it draws; and its own fields are absent from the union, so reading them needs a cast,
 * which erases the rest of the frontmatter along with them.
 *
 * Naming the kind is what makes `{data.type === 'mold' && <MoldBody entry={entry} />}` checked at
 * the CALL SITE. The branch and the component then agree by compilation rather than by reading.
 */
export type NoteOf<C extends NoteCollection> = CollectionEntry<C>;

/**
 * The `type` literal of a note — the discriminator every arm of the union carries.
 *
 * Derived from the union rather than re-listed, so a table keyed by it (`TYPE_LABELS` on the note
 * route) gains a required row the moment a kind is added, instead of falling through to a default.
 */
export type NoteType = NoteEntry['data']['type'];

/**
 * What to call a note, for a reader that has one of any kind.
 *
 * The kinds name themselves differently — most carry a `title`, molds and patterns carry a `name`,
 * a CLI command is its `tool command` pair — and none of those fields is on every arm, so this is
 * a question the union forces someone to answer. Four callers answered it privately: the note
 * route, the tag pages, the incoming-references list and the mold artifact tables, each reading
 * the fields off `any` and each spelling the id fallback again.
 *
 * Three of the four agreed. The fourth asked for `name` before `title` and fell back to a raw
 * basename, so an artifact table showed `summarize-nextflow` where every other surface on the site
 * showed `Summarize Nextflow` — a disagreement no page could see, because each was only ever read
 * next to itself.
 */
export function noteTitle(entry: NoteEntry): string {
  const data = entry.data;
  if ('title' in data && data.title) return data.title;
  if ('name' in data && data.name) return data.name;
  if ('tool' in data && 'command' in data) return `${data.tool} ${data.command}`;
  return entry.id
    .split('/')
    .pop()!
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Every note in the corpus, in collection order then id order.
 *
 * Sorted rather than left in load order: several callers build maps and lists straight off
 * this, and a stable order keeps generated pages from reshuffling between builds.
 */
export async function getAllNotes(): Promise<NoteEntry[]> {
  const perCollection = await Promise.all(
    NOTE_COLLECTIONS.map(async name => {
      const entries: NoteEntry[] = await getCollection(name);
      return entries.sort((a, b) => a.id.localeCompare(b.id));
    }),
  );
  return perCollection.flat();
}
