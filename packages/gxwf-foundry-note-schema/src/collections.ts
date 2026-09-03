// Where each kind's notes LIVE — the one path→kind routing table.
//
// Two things used to decide which files are notes, and they were written twice: the Astro
// loader's glob in site/src/content.config.ts, and `walk.ts`'s SKIP_FILES / DIR_NOTE_TYPES in
// the validator. Nothing made them agree, and they did not: `content/prompts/**` was walked by
// the validator and globbed by neither, so two notes were checked and never published.
//
// This is that table, stated once. A collection maps a directory (plus the glob selecting note
// files within it) to the ONE kind every note there declares. Both consumers route from here,
// so a directory the site publishes and a directory the validator checks cannot drift apart.
//
// A collection is a LOCATION; a kind is what a note IS. They are deliberately not one-to-one:
// `cli/<tool>/index.md` is a cli-tool and `cli/<tool>/<command>.md` is a cli-command, one
// directory holding two kinds. The reverse (two collections, one kind) is equally allowed —
// it is how a browse route can exist without inventing a kind for it.

// The MATCHING is not ours — it ships in @galaxy-foundry/kind-schema, because the alternative
// is each instance writing a glob matcher and each getting `**/` subtly wrong in its own way.
// The TABLE is ours: it names this Foundry's directories. The wrappers below bind the two, so
// no caller has to remember to pass the table.
import {
  collectionOf as routeCollection,
  collectionsClaiming as routeClaiming,
  kindOf as routeKind,
  matchesCollection,
  type CollectionRoute,
} from "@galaxy-foundry/kind-schema/collections";

/**
 * One collection: a directory, the note files in it, and the kind they all declare.
 *
 * `base` is repo-relative here — the shared type leaves the frame to the caller, and this is
 * the frame both consumers can check a real path against without knowing where they ran from.
 */
export type CollectionDefinition = CollectionRoute;

/**
 * The one directory every collection lives under, stated once.
 *
 * `base` is written repo-relative because that is the form both consumers can check a real
 * path against without knowing where they were invoked from. Consumers that walk the content
 * tree directly are handed that directory under whatever name it has on disk, so they need
 * this to route what they find. The routing test pins it against the table.
 */
export const CONTENT_DIR = "content";

/**
 * Every collection this Foundry publishes and validates.
 *
 * Keys are kebab-case to match the kind vocabulary (`source-pattern`, `cli-tool`) rather than
 * the camelCase an identifier would want — they are looked up as strings, never as properties.
 */
export const COLLECTIONS = {
  // The design record. `glossary.md` shares the directory and is deliberately NOT a note: it is
  // hand-curated, alphabetical, and rendered by its own page. It is excluded HERE, in the
  // pattern, rather than by each consumer — which is the whole point of the table, and is why
  // the exclusion survived at all. It used to sit in the site's glob as `!meta/glossary.md`,
  // and was dropped when no collection's base reached `content/meta/` any more. This row makes
  // that directory reachable again, so the rule has to come back with it.
  //
  // The negation says only that the glossary is not one of THESE. `NOT_NOTES.glossary` below is
  // what says it is not a note at all — and the two have to agree, because a file excluded here
  // and undeclared there is unrouted, which is now an error rather than a silence.
  meta: { base: "content/meta", pattern: ["*.md", "!glossary.md"], kind: "meta" },
  molds: { base: "content/molds", pattern: ["**/index.md"], kind: "mold" },
  patterns: { base: "content/patterns", pattern: ["**/*.md"], kind: "pattern" },
  "source-patterns": {
    base: "content/source-patterns",
    pattern: ["**/*.md"],
    kind: "source-pattern",
  },
  // One directory, two kinds, separated by filename. `index.md` is the tool; every other
  // markdown file beside it is one of that tool's commands. This is the case that makes a
  // directory→kind rule insufficient on its own.
  "cli-tools": { base: "content/cli", pattern: ["*/index.md"], kind: "cli-tool" },
  "cli-commands": { base: "content/cli", pattern: ["*/*.md", "!*/index.md"], kind: "cli-command" },
  pipelines: { base: "content/pipelines", pattern: ["**/index.md"], kind: "pipeline" },
  research: { base: "content/research", pattern: ["**/index.md"], kind: "research" },
  schemas: { base: "content/schemas", pattern: ["**/*.md"], kind: "schema" },
  prompts: { base: "content/prompts", pattern: ["**/index.md"], kind: "prompt" },
} as const satisfies Record<string, CollectionDefinition>;

export type CollectionName = keyof typeof COLLECTIONS;

/** Collection names, for a consumer that needs to iterate every collection. */
export const COLLECTION_NAMES = Object.keys(COLLECTIONS) as readonly CollectionName[];

/**
 * The collection a repo-relative path belongs to, or `undefined` if it is not a note.
 *
 * A path matching more than one collection is a table bug rather than a caller error — the
 * routing test asserts it cannot happen, so the first match is the only match.
 */
export function collectionOf(repoRelPath: string): CollectionName | undefined {
  return routeCollection(COLLECTIONS, repoRelPath);
}

/** The kind a repo-relative path routes to, or `undefined` if it is not a note. */
export function kindOf(repoRelPath: string): string | undefined {
  return routeKind(COLLECTIONS, repoRelPath);
}

/**
 * EVERY collection claiming a path, not just the first.
 *
 * Exists for the routing test that asserts the answer is never longer than one entry — which is
 * what earns `collectionOf` the right to return the first match and stop.
 */
export function collectionsClaiming(repoRelPath: string): CollectionName[] {
  return routeClaiming(COLLECTIONS, repoRelPath);
}

/** Markdown under `content/` that is deliberately not a note, and why. */
export interface NonNoteAllowance {
  /** Directory holding it, repo-relative — the same frame COLLECTIONS states its bases in. */
  base: string;
  /** Globs relative to `base`. Later `!`-prefixed entries exclude, as in a collection. */
  pattern: readonly string[];
  /** Why it is not a note. Read back in the error when something unaccounted-for turns up. */
  reason: string;
}

/**
 * Markdown under `content/` that no collection claims and none should.
 *
 * The corpus used to account for these by SILENCE: no collection's base reached the content
 * root or `content/meta/`, so they fell out of the routing table and nothing had to say so.
 * That works exactly as well for a file nobody meant to add. An allowance table closes the set
 * — every markdown file under `content/` is now a note, a companion its kind declares, or one
 * of these, and anything else is an error rather than a thing the walker quietly skips.
 *
 * These are FILES, not areas. `content/meta/` was briefly the exception — a whole directory
 * declared outside the note system, back when the glossary was the only thing in it. It is not
 * an exception any more: the directory is the design record's home, twelve notes of the `meta`
 * kind, and only `glossary.md` remains outside. An area allowance that outlived the area it
 * described would have gone on covering every future stray beneath it — which is the silence
 * this table exists to end, reintroduced one directory at a time.
 */
export const NOT_NOTES = {
  dashboard: {
    base: CONTENT_DIR,
    pattern: ["Dashboard.md"],
    reason: "generated by `foundry-build generate-dashboard`",
  },
  index: {
    base: CONTENT_DIR,
    pattern: ["Index.md"],
    reason: "generated by `foundry-build generate-index`",
  },
  glossary: {
    base: `${CONTENT_DIR}/meta`,
    pattern: ["glossary.md"],
    reason: "vocabulary the corpus is written in, not part of the corpus",
  },
} as const satisfies Record<string, NonNoteAllowance>;

export type NonNoteName = keyof typeof NOT_NOTES;

/** Allowance names, for a consumer that needs to iterate the table. */
export const NON_NOTE_NAMES = Object.keys(NOT_NOTES) as readonly NonNoteName[];

// An allowance is a location with no kind, so it cannot be a `CollectionRoute` — but the
// MATCHING is the same question, and answering it a second way here would mean a second glob
// dialect, which is the drift `kind-schema/collections` exists to end. So the row borrows that
// matcher under a kind that names what it is not.
const NOT_A_NOTE = "\0not-a-note";

/**
 * The allowance covering a path, or `undefined` if none does.
 *
 * Only meaningful for a path no collection claims: a note is a note whatever this returns.
 */
export function nonNoteAllowanceOf(repoRelPath: string): NonNoteName | undefined {
  return NON_NOTE_NAMES.find((name) =>
    matchesCollection(repoRelPath, { ...NOT_NOTES[name], kind: NOT_A_NOTE }),
  );
}
