import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { buildTagIndex, loadTagRegistry, tagRegistry, type TagRegistryFile } from "../src/index.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../../..");
const real = loadTagRegistry(path.join(repoRoot, "meta_tags.yml"));

// Membership is DECLARED — a tag is valid because some facet lists it under `values`,
// never because its text starts with a facet name. A synthetic registry proves the
// properties the real one cannot: it has exactly one bare tag, so "bare keys work" and
// "prefix-lookalikes are rejected" need cases the vocabulary does not naturally supply.
const synthetic: TagRegistryFile = {
  version: 1,
  facets: {
    meta: { label: "Meta", description: "Foundry-meta notes.", values: { meta: "A meta note." } },
    target: {
      label: "Target",
      description: "What a Mold produces for.",
      values: { "target/x": "An X." },
    },
    empty: { label: "Empty", description: "Declares no members." },
  },
};

describe("tag registry format", () => {
  it("resolves a bare key exactly like a slashed one", () => {
    const index = buildTagIndex(synthetic);
    expect(index.get("meta")).toEqual({ facet: "meta", gloss: "A meta note." });
    expect(index.get("target/x")).toEqual({ facet: "target", gloss: "An X." });
  });

  // The whole point of declared membership: this must NOT validate, or membership would
  // be prefix-parsing wearing a new name.
  it("rejects an undeclared tag that merely looks namespaced", () => {
    expect(tagRegistry(synthetic).isValidTag("target/unlisted")).toBe(false);
  });

  it("tolerates a facet with no values block", () => {
    expect(
      tagRegistry(synthetic)
        .facets()
        .map((f) => f.key),
    ).toContain("empty");
    expect(tagRegistry(synthetic).allTags()).not.toContain("empty");
  });

  it("attributes a tag to the facet that declared it, not its prefix", () => {
    const r = tagRegistry({
      version: 1,
      // `cli/gxwf` declared under `tool`, deliberately: prefix-parsing would say "cli".
      facets: { tool: { label: "Tool", description: "…", values: { "cli/gxwf": "gxwf." } } },
    });
    expect(r.facetOf("cli/gxwf")).toBe("tool");
    expect(r.facetLabel(r.facetOf("cli/gxwf"))).toBe("Tool");
  });
});

describe("the real registry (meta_tags.yml)", () => {
  it("validates its own tags and rejects an unregistered one", () => {
    expect(real.isValidTag("target/galaxy")).toBe(true);
    expect(real.isValidTag("meta")).toBe(true);
    expect(real.isValidTag("target/not-a-real-thing")).toBe(false);
    expect(real.isValidTag("nonsense")).toBe(false);
  });

  // Closed forever: an undocumented tag has nothing for the browse surface to render.
  it("gives every registered tag a non-empty gloss and a declaring facet", () => {
    const bad = real
      .allTags()
      .filter((t) => !real.tagDescription(t)?.trim() || real.facetOf(t) === undefined);
    expect(bad).toEqual([]);
  });

  it("declares no open facets", () => {
    const raw = loadTagRegistry(path.join(repoRoot, "meta_tags.yml"));
    // `open` was never a concept in this loader and must not become one silently: the
    // sibling Foundry removed its support, so a stray `open: true` here would be inert.
    for (const f of raw.facets()) expect(Object.keys(f)).toEqual(["key", "label", "description"]);
  });

  it("gives every facet a label and description for the browse surface", () => {
    const bare = real.facets().filter((f) => !f.label?.trim() || !f.description?.trim());
    expect(bare).toEqual([]);
  });
});
