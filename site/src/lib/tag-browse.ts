// How tags browse: the tags a corpus uses, grouped into the facets that declared them.
//
// `@galaxy-foundry/tag-registry` owns the rule this rests on — membership is DECLARED, never
// parsed off the text before a `/` — and both instances say so in their own notes, listing
// "browse by declaring facet" among the rules that moved into the package. What the package
// ships is the LOOKUP: `facets()`, `facetOf`, `tagDescription`. Turning the lookup into a browse
// surface is left to the caller, and every caller wrote the same fifteen lines.
//
// That is not the same code in two places. It is one decision — the browse order, the
// empty-facet rule, what becomes of a tag no facet declared — taken privately at each call site,
// and agreeing only because nothing had ever made it disagree.
//
// The counts are the caller's, and they are the seam: what counts as a tagged thing is the one
// part of this that is genuinely per-instance — an entry across several collections in one repo,
// a note that is not archived in the other. Everything above the counts is not, which is why
// this is the same file in both.

import type { FacetInfo, TagRegistry } from '@galaxy-foundry/tag-registry';

/** One facet with the tags under it that the corpus actually uses. */
export interface FacetGroup extends FacetInfo {
  tags: { tag: string; count: number; gloss?: string }[];
}

/**
 * Tags in use, grouped by the facet that DECLARED each one.
 *
 * Facets keep their declared order, because that order is an editorial decision the registry
 * makes and a browse page should not re-take. A facet nothing uses is dropped rather than
 * rendered empty.
 *
 * There is no "other" bucket, and the reason belongs here rather than at each call site: every
 * registered tag has a declaring facet and an unregistered one fails schema validation long
 * before it reaches a page, so a tag that fell through would be a tag that cannot exist.
 */
export function groupTagsInUse(registry: TagRegistry, counts: Map<string, number>): FacetGroup[] {
  const used = [...counts.keys()].sort((a, b) => a.localeCompare(b));
  return registry
    .facets()
    .map(facet => ({
      ...facet,
      tags: used
        .filter(tag => registry.facetOf(tag) === facet.key)
        .map(tag => ({ tag, count: counts.get(tag) ?? 0, gloss: registry.tagDescription(tag) })),
    }))
    .filter(group => group.tags.length > 0);
}

/**
 * The label of the facet that declared a tag — what a single tag's page puts above its name.
 *
 * Here rather than spelled out at the call site so that `facetOf` has exactly one reader. The
 * nesting is the whole point: `facetLabel(facetOf(tag))` is correct, and
 * `facetLabel(tag.split('/')[0])` is also correct for every tag that happens to be slashed —
 * which is every tag either registry declares today.
 */
export function facetLabelOf(registry: TagRegistry, tag: string): string {
  return registry.facetLabel(registry.facetOf(tag));
}
