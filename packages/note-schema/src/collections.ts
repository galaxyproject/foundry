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

/** One collection: a directory, the note files in it, and the kind they all declare. */
export interface CollectionDefinition {
  /** Repo-relative directory holding this collection's notes. */
  base: string;
  /** Globs relative to `base` selecting note files. Later `!`-prefixed entries exclude. */
  pattern: readonly string[];
  /** The `type:` every note in this collection declares. Must be a kind in KINDS. */
  kind: string;
}

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

// The three glob constructs the table above uses, and nothing more. Astro's loader matches
// these patterns with picomatch; this matches them for the validator, which has no globber.
// Two implementations of the same patterns is exactly the drift this module exists to end, so
// the routing test pins this one against the real corpus — if it and picomatch ever disagreed
// about a file, the published collection sizes would stop matching the walked file count.
function globToRegExp(pattern: string): RegExp {
  let out = "";
  for (let i = 0; i < pattern.length; i += 1) {
    const rest = pattern.slice(i);
    if (rest.startsWith("**/")) {
      out += "(?:[^/]+/)*"; // zero or more leading path segments
      i += 2;
    } else if (pattern[i] === "*") {
      out += "[^/]*"; // one segment, no separators
    } else if (".+^${}()|[]\\?".includes(pattern[i]!)) {
      out += `\\${pattern[i]}`;
    } else {
      out += pattern[i];
    }
  }
  return new RegExp(`^${out}$`);
}

/**
 * The collection a repo-relative path belongs to, or `undefined` if it is not a note.
 *
 * A path matching more than one collection is a table bug rather than a caller error — the
 * routing test asserts it cannot happen, so the first match is the only match.
 */
export function collectionOf(repoRelPath: string): CollectionName | undefined {
  const normalized = repoRelPath.split("\\").join("/");
  for (const name of COLLECTION_NAMES) {
    if (matchesCollection(normalized, COLLECTIONS[name])) return name;
  }
  return undefined;
}

/** Whether a repo-relative path is one of this collection's note files. */
export function matchesCollection(repoRelPath: string, collection: CollectionDefinition): boolean {
  const prefix = `${collection.base}/`;
  if (!repoRelPath.startsWith(prefix)) return false;
  const withinBase = repoRelPath.slice(prefix.length);
  let matched = false;
  for (const pattern of collection.pattern) {
    const negated = pattern.startsWith("!");
    const re = globToRegExp(negated ? pattern.slice(1) : pattern);
    if (!re.test(withinBase)) continue;
    if (negated) return false;
    matched = true;
  }
  return matched;
}

/** The kind a repo-relative path routes to, or `undefined` if it is not a note. */
export function kindOf(repoRelPath: string): string | undefined {
  const name = collectionOf(repoRelPath);
  return name && COLLECTIONS[name].kind;
}
