import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { loadTagRegistry } from "@galaxy-foundry/note-schema";
import { readMarkdown } from "../packages/build-cli/src/lib/frontmatter.js";
import { findMdFiles } from "../packages/build-cli/src/lib/walk.js";

// The registry and the corpus must agree BOTH ways.
//
// The schema rejects a note carrying an unregistered tag; that direction is cheap and the
// validator already covers it. This is the converse — nothing registered is carried by zero
// notes. Dead vocabulary is otherwise only found by diffing two instances by hand, which is
// the manual pass this exists to retire (galaxyproject/foundry-pattern#12).
//
// It lives here rather than in `validateDirectory` on purpose: that runs against arbitrary
// directories, including small fixtures where nearly every registered tag is legitimately
// unused. The question only means anything against the whole corpus.

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const registry = loadTagRegistry(path.join(repoRoot, "meta_tags.yml"));

const tagsInUse = (() => {
  const inUse = new Set<string>();
  for (const file of findMdFiles(path.join(repoRoot, "content"))) {
    const { meta } = readMarkdown(file);
    const tags = meta?.tags;
    if (!Array.isArray(tags)) continue;
    for (const t of tags) if (typeof t === "string") inUse.add(t);
  }
  return inUse;
})();

describe("registry drift (authored vocabulary vs corpus)", () => {
  // Guards the walk itself: if the frontmatter reader stopped matching, every assertion
  // below would pass vacuously and report a clean bill of health we did not earn.
  it("found tags in use to check against", () => {
    expect(tagsInUse.size).toBeGreaterThan(10);
  });

  it("has no registered tag carried by zero notes", () => {
    const dead = registry.allTags().filter((t) => !tagsInUse.has(t));
    expect(dead, `\nregistered but unused: ${dead.join(", ")}`).toEqual([]);
  });

  // A facet whose members are all unused renders as nothing on /tags — a browse axis that
  // exists only in the registry.
  it("has no facet with zero members in use", () => {
    const empty = registry
      .facets()
      .map((f) => f.key)
      .filter((key) => ![...tagsInUse].some((t) => registry.facetOf(t) === key));
    expect(empty, `\nfacets with no tags in use: ${empty.join(", ")}`).toEqual([]);
  });

  // The schema enforces this per-note; asserting it over the corpus catches a tag that
  // slipped in via a path the schema does not cover (generated notes, hand-edited casts).
  it("has no tag in use that the registry does not declare", () => {
    const unregistered = [...tagsInUse].filter((t) => !registry.isValidTag(t));
    expect(unregistered, `\nin use but unregistered: ${unregistered.join(", ")}`).toEqual([]);
  });
});
