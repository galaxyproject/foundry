// The grammar itself — slugify's passes, bracket stripping, anchors, pipe aliases — is
// tested in @galaxy-foundry/wiki-links, where both Foundries share it. What is left here is
// the part that is ours: the `string | null` contract this repo's call sites were written
// against, and the resolution rule as it applies to our corpus.

import { describe, expect, it } from "vitest";
import { resolveWikiLink, slugify, stripBrackets } from "../scripts/lib/wiki-links.js";

describe("the wrapper contract", () => {
  const slugMap = new Map([
    ["foo", "/notes/foo.md"],
    ["foo-bar", "/notes/foo-bar.md"],
    ["foo-bar-baz", "/notes/foo-bar-baz.md"],
  ]);

  // Callers here branch on `null`, not `undefined`. The package returns `undefined`, so the
  // conversion is the whole reason the wrapper still exists.
  it("returns the path on a hit and null on a miss, never undefined", () => {
    expect(resolveWikiLink("[[foo]]", slugMap)).toBe("/notes/foo.md");
    expect(resolveWikiLink("[[zzz]]", slugMap)).toBeNull();
    expect(resolveWikiLink("not a link", slugMap)).toBeNull();
  });

  it("re-exports the grammar the validator and the caster import from here", () => {
    expect(slugify("Foo  -  Bar")).toBe("foo-bar");
    expect(stripBrackets("[[Foo]]")).toBe("Foo");
    expect(stripBrackets("plain")).toBeNull();
  });
});

// This repo used to fall back to a prefix match, sorted shortest-first. Resolving every
// `[[...]]` in the corpus both ways found it changed the answer for exactly ONE link:
// `[[...]]` in content/meta/glossary.md, which slugifies to the empty string and so
// prefix-matched all 264 map keys, landing on `cli/cwl-utils`. Every other one of the 3,108
// links already matched exactly. The fallback never once completed a real stub.
describe("resolution is exact", () => {
  const slugMap = new Map([
    ["foo", "/notes/foo.md"],
    ["foo-bar", "/notes/foo-bar.md"],
  ]);

  it("does not complete a partial stub", () => {
    expect(resolveWikiLink("[[foo-b]]", slugMap)).toBeNull();
  });

  // The link that motivated the change. An empty slug is a prefix of every key, so under the
  // old rule this rendered as a confident link to an arbitrary note.
  it("declines a payload that slugifies to nothing", () => {
    expect(slugify("...")).toBe("");
    expect(resolveWikiLink("[[...]]", slugMap)).toBeNull();
  });

  it("still resolves an exact match through an anchor or an alias", () => {
    expect(resolveWikiLink("[[foo#section]]", slugMap)).toBe("/notes/foo.md");
    expect(resolveWikiLink("[[foo|see this]]", slugMap)).toBe("/notes/foo.md");
  });
});
