// Nobody here decides which facet a tag belongs to.
//
// The browse decisions — group by the facet that DECLARED a tag rather than the text before its
// slash, keep the registry's order, drop a facet nothing uses, invent no "other" bucket — used to
// be taken in this repo, in `site/src/lib/tag-browse.ts`, and identically in the sibling instance.
// They are one decision, not two, so @galaxy-foundry/tag-registry took them: `groupTagsInUse` and
// `facetLabelOf` ship there from 0.1.1, proven against a synthetic registry with a bare tag and
// prefixes that name the wrong facet — the case neither instance's own vocabulary can express.
//
// What remains here is the adoption itself. `facetOf` is the tell: re-taking any of those
// decisions means asking the registry which facet declared a tag and then doing something with
// the answer, and the only correct number of places in this site to do that is now zero.

import { describe, expect, it } from "vitest";

import { repoRelative, siteSourceCode, siteSourceFiles } from "./site-sources";

describe("who decides how tags browse", () => {
  it("is the package, not this site", () => {
    // The same shape as `site-base.test.ts`: the assertion is the READER SET, not the correct
    // expression, because a second reader that agrees today is invisible until it stops.
    const readers = siteSourceFiles()
      .filter((file) => /\bfacetOf\b/.test(siteSourceCode(file)))
      .map(repoRelative)
      .sort();

    expect(
      readers,
      "\nmodules deciding which facet a tag belongs to. @galaxy-foundry/tag-registry answers this" +
        " and groups by it; a caller that asks `facetOf` and then re-decides the browse order, the" +
        " empty-facet rule or what happens to an unregistered tag has taken the decision again," +
        " and nothing compares the two answers.",
    ).toEqual([]);
  });
});
