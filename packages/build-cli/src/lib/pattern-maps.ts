// A pattern map's leaves: its `related_patterns` less sibling maps, which ship only when declared.

import type { Frontmatter } from "./types.js";
import { resolveWikiLink } from "./wiki-links.js";

export function isPatternMap(meta: Frontmatter | undefined): boolean {
  return meta?.type === "pattern" && meta.pattern_kind === "moc";
}

/** A leaf link as the map writes it, and the note it resolves to (null when it does not). */
export interface PatternMapLeaf {
  readonly link: string;
  readonly path: string | null;
}

export function patternMapLeaves(
  meta: Frontmatter,
  slugMap: ReadonlyMap<string, string>,
  metaByPath: ReadonlyMap<string, Frontmatter>,
): PatternMapLeaf[] {
  const listed = Array.isArray(meta.related_patterns) ? meta.related_patterns : [];
  return listed
    .filter((link): link is string => typeof link === "string")
    .map((link) => ({ link, path: resolveWikiLink(link, slugMap) }))
    .filter((leaf) => !leaf.path || !isPatternMap(metaByPath.get(leaf.path)));
}
