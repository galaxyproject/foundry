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
  kindOf as routeKind,
  matchesCollection,
  type CollectionRoute,
} from "@galaxy-foundry/kind-schema/collections";

export { matchesCollection };

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
  research: { base: "content/research", pattern: ["**/*.md"], kind: "research" },
  schemas: { base: "content/schemas", pattern: ["**/*.md"], kind: "schema" },
  prompts: { base: "content/prompts", pattern: ["**/*.md"], kind: "prompt" },
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
