import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import yaml from "js-yaml";
import { loadTagRegistry } from "@galaxy-foundry/tag-registry";
import { groupTagsInUse } from "../site/src/lib/tag-browse";
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

  // A facet whose members are all unused renders as nothing on /tags — a browse axis that exists
  // only in the registry. Asked OF the grouping rather than recomputed alongside it: this check
  // reasons about what the tags index shows, and it used to reach that conclusion by its own
  // route, which is a second answer to the question dressed up as a test of the first.
  it("has no facet with zero members in use", () => {
    const shown = new Set(
      groupTagsInUse(registry, new Map([...tagsInUse].map((t) => [t, 1] as const))).map((g) => g.key),
    );
    const empty = registry
      .facets()
      .map((f) => f.key)
      .filter((key) => !shown.has(key));
    expect(empty, `\nfacets with no tags in use: ${empty.join(", ")}`).toEqual([]);
  });

  // The schema enforces this per-note; asserting it over the corpus catches a tag that
  // slipped in via a path the schema does not cover (generated notes, hand-edited casts).
  it("has no tag in use that the registry does not declare", () => {
    const unregistered = [...tagsInUse].filter((t) => !registry.isValidTag(t));
    expect(unregistered, `\nin use but unregistered: ${unregistered.join(", ")}`).toEqual([]);
  });
});

// What @galaxy-foundry/tag-registry cannot check for us, on the registry it does parse.
//
// It refuses an undocumented tag and a tag two facets both declare, so those need no
// assertion here — a violation cannot reach a test, it throws at load. What it does not do
// is object to keys it has never heard of: an unrecognized facet field is ignored, exactly
// as both instances' hand-rolled loaders ignored it.
describe("closed-registry invariant", () => {
  it("declares no open facets in meta_tags.yml", () => {
    // `open` was a concept the loader once honored and no longer does. A re-added
    // `open: true` would therefore be a SILENT no-op — a facet the author believes is
    // extensible while the registry stays closed. This is what turns that into a failure.
    const raw = yaml.load(readFileSync(path.join(repoRoot, "meta_tags.yml"), "utf8")) as {
      facets: Record<string, Record<string, unknown>>;
    };
    const open = Object.entries(raw.facets)
      .filter(([, f]) => "open" in f)
      .map(([key]) => key);
    expect(open, `\nfacets declaring \`open\`: ${open.join(", ")}`).toEqual([]);
  });

  // The package requires both fields and refuses an empty string, so what is left for this
  // to catch is the whitespace-only case — a facet that parses but renders as a blank
  // heading on /tags.
  it("gives every facet a label and description for the browse surface", () => {
    const bare = registry.facets().filter((f) => !f.label.trim() || !f.description.trim());
    expect(bare).toEqual([]);
  });

  // A spot check that our own vocabulary resolves through the shared loader at all, in both
  // directions. The corpus checks above would all pass vacuously against an empty registry.
  it("validates its own tags and rejects an unregistered one", () => {
    expect(registry.isValidTag("target/galaxy")).toBe(true);
    expect(registry.isValidTag("meta")).toBe(true);
    expect(registry.isValidTag("target/not-a-real-thing")).toBe(false);
    expect(registry.allTags().length).toBeGreaterThan(10);
  });
});
