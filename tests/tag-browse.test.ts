// One reader for "which facet declared this tag", and what it does with the answer.
//
// The registry decides membership. A page that asks it, then re-decides what to do with the
// answer, has not really deferred: the browse order, the empty-facet rule and the absence of an
// "other" bucket are all decisions, and each call site that takes them again is a place they can
// be taken differently. They were — the tags index and the drift check reasoned about the same
// grouping in two shapes, and neither could tell you it was disagreeing.
//
// Behaviour is asserted against a SYNTHETIC registry rather than this repo's own. A real registry
// whose vocabulary is entirely slashed cannot distinguish "grouped by declaration" from "grouped
// by the text before the slash", which is the one confusion this code exists to prevent — so the
// fixture below carries a bare tag and tags whose prefixes name the wrong facet.
//
// The same file, against the same module, is in the sibling instance.

import { describe, expect, it } from "vitest";
import { tagRegistry as buildRegistry } from "@galaxy-foundry/tag-registry";

import { facetLabelOf, groupTagsInUse } from "../site/src/lib/tag-browse";
import { repoRelative, siteSourceCode, siteSourceFiles } from "./site-sources";

const REGISTRY = buildRegistry({
  facets: {
    family: {
      label: "Family",
      description: "Which family of methods.",
      // `role/solo` is declared HERE, under family — its prefix names another facet on purpose.
      values: { "family/a": "Family A.", "role/solo": "Neither, and declared here anyway." },
    },
    role: {
      label: "Role",
      description: "What it does.",
      values: { "family/b": "Also misleading." },
    },
    // Declared, used by nothing. The facet order below is this object's order, not alphabetical.
    domain: { label: "Domain", description: "Subject matter.", values: { "domain/x": "X." } },
    meta: { label: "Meta", description: "About the corpus.", values: { meta: "A bare tag." } },
  },
});

const counts = (...pairs: [string, number][]) => new Map(pairs);

describe("grouping tags in use", () => {
  it("groups by the facet that declared a tag, not by its prefix", () => {
    const groups = groupTagsInUse(
      REGISTRY,
      counts(["family/a", 1], ["role/solo", 2], ["family/b", 3]),
    );

    expect(groups.map((g) => [g.key, g.tags.map((t) => t.tag)])).toEqual([
      ["family", ["family/a", "role/solo"]],
      ["role", ["family/b"]],
    ]);
  });

  it("keeps the registry's declared facet order", () => {
    const groups = groupTagsInUse(REGISTRY, counts(["meta", 1], ["domain/x", 1], ["family/a", 1]));

    expect(groups.map((g) => g.key)).toEqual(["family", "domain", "meta"]);
  });

  it("drops a facet nothing uses rather than rendering it empty", () => {
    const groups = groupTagsInUse(REGISTRY, counts(["family/a", 1]));

    expect(groups.map((g) => g.key)).toEqual(["family"]);
  });

  it("carries each tag's count and gloss", () => {
    const [group] = groupTagsInUse(REGISTRY, counts(["meta", 7]));

    expect(group?.tags).toEqual([{ tag: "meta", count: 7, gloss: "A bare tag." }]);
  });

  it("has no bucket for a tag no facet declared", () => {
    // An unregistered tag fails schema validation long before a page sees it, so the honest
    // behaviour is to drop it — not to invent an "other" facet the registry never declared and
    // that no reader could get a gloss for.
    const groups = groupTagsInUse(REGISTRY, counts(["family/a", 1], ["nowhere/at-all", 9]));

    expect(groups.flatMap((g) => g.tags.map((t) => t.tag))).toEqual(["family/a"]);
  });

  it("labels a single tag by its declaring facet", () => {
    expect(facetLabelOf(REGISTRY, "role/solo")).toBe("Family");
    expect(facetLabelOf(REGISTRY, "meta")).toBe("Meta");
  });
});

describe("the reader of that decision", () => {
  it("is one module", () => {
    // The same shape as `site-base.test.ts`: the assertion is the SINGLE READER, not the correct
    // expression, because a second reader that agrees today is invisible until it stops.
    const readers = siteSourceFiles()
      .filter((file) => /\bfacetOf\b/.test(siteSourceCode(file)))
      .map(repoRelative)
      .sort();

    expect(
      readers,
      "\nmodules deciding which facet a tag belongs to. The registry answers this; a second" +
        " caller that asks it and then re-decides the browse order, the empty-facet rule or what" +
        " happens to an unregistered tag has taken the decision again, and nothing compares the" +
        " two answers.",
    ).toEqual(["site/src/lib/tag-browse.ts"]);
  });
});
