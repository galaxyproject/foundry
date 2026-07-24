// Loader for meta_tags.yml — the controlled tag vocabulary.
//
// The FORMAT is shared across Foundry instances (spec: galaxyproject/foundry-pattern,
// `content/pattern/standing-up-a-foundry.instructions.txt`), so treat a format change as
// a cross-repo change. The facet VOCABULARY in meta_tags.yml is this instance's own.

import { readFileSync } from "node:fs";

import yaml from "js-yaml";

/** One declared grouping of tags: a browse axis with its members and their glosses. */
export interface Facet {
  label: string;
  description: string;
  /** tag -> one-line gloss. The keys are the tags themselves, not leaf names. */
  values?: Record<string, string>;
}

export interface TagRegistryFile {
  version: number;
  facets: Record<string, Facet>;
}

export interface FacetInfo {
  key: string;
  label: string;
  description: string;
}

interface TagEntry {
  /** The facet that DECLARED this tag — not whatever precedes its slash. */
  facet: string;
  gloss: string;
}

/**
 * Flatten a registry to `tag -> { facet, gloss }`.
 *
 * This is the one place membership is decided, and it is decided by DECLARATION: a tag is
 * valid because some facet lists it under `values`, never because its text happens to
 * start with a facet name. So the slash in `target/galaxy` is a naming convention rather
 * than a rule, and a bare key like `meta` is an ordinary member of its facet — no flat-flag
 * special case anywhere in the loader, the schema, or the browse pages.
 */
export function buildTagIndex(file: TagRegistryFile): Map<string, TagEntry> {
  const index = new Map<string, TagEntry>();
  for (const [facet, f] of Object.entries(file?.facets ?? {})) {
    for (const [tag, gloss] of Object.entries(f.values ?? {})) index.set(tag, { facet, gloss });
  }
  return index;
}

export interface TagRegistry {
  /** Valid iff the tag is an exact key under some facet's `values`. Every facet is
   *  closed — no open/prefix-wildcard family — so every usable tag has a gloss. */
  isValidTag(tag: string): boolean;
  /** Facets in declared order; the tag index groups by these. */
  facets(): FacetInfo[];
  /** The facet that declared this tag, or undefined if unregistered. Callers group by
   *  this rather than by prefix, which is what makes an "other" bucket impossible. */
  facetOf(tag: string): string | undefined;
  facetLabel(key: string | undefined): string;
  /** A tag's registry gloss. Every valid tag has one. */
  tagDescription(tag: string): string | undefined;
  /** Every registered tag, in declaration order. */
  allTags(): string[];
}

export function tagRegistry(file: TagRegistryFile): TagRegistry {
  const index = buildTagIndex(file);
  const facetMap = file?.facets ?? {};
  return {
    isValidTag: (tag) => index.has(tag),
    facets: () =>
      Object.entries(facetMap).map(([key, f]) => ({
        key,
        label: f.label,
        description: f.description,
      })),
    facetOf: (tag) => index.get(tag)?.facet,
    facetLabel: (key) => (key && facetMap[key]?.label) || (key ?? ""),
    tagDescription: (tag) => index.get(tag)?.gloss,
    allTags: () => [...index.keys()],
  };
}

export function loadTagRegistry(tagsPath: string): TagRegistry {
  return tagRegistry(yaml.load(readFileSync(tagsPath, "utf8")) as TagRegistryFile);
}
