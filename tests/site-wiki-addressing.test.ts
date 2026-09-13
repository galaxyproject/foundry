// The site answers the same addresses the validator does.
//
// `wiki-addressing.test.ts` pins the rule against the corpus on the validator's side, where the
// reader's addressing already holds. This is the same question asked of the SITE, which is the
// half that renders: given a `[[...]]` written in body prose, does the page get a link, and does
// that link land on the note the validator resolved the same address to.
//
// Asked through the remark transform rather than a map, because a map that agrees and a page
// that renders are different claims — #456 is four links dead on the deployed site while
// `validate` reports green, and a map-equality test is exactly the shape that misses it.

import path from "node:path";

import { describe, expect, it } from "vitest";

import { slugify } from "@galaxy-foundry/wiki-links";

import { GALAXY_SLUG_ALIASES, readContent } from "../packages/build-cli/src/lib/slug-map.js";
import remarkWikiLinksPlugin from "../site/src/lib/remark-wiki-links.js";
import { REPO_ROOT } from "./site-sources";

const CONTENT = path.join(REPO_ROOT, "content");
const BASE = "/foundry";

const index = readContent(CONTENT, GALAXY_SLUG_ALIASES);
const transform = remarkWikiLinksPlugin({ contentDir: CONTENT, base: BASE });

/** What the site renders `[[address]]` as, in running prose. */
function render(address: string): { type: string; url?: string } {
  const tree = {
    type: "root",
    children: [
      { type: "paragraph", children: [{ type: "text", value: `see [[${address}]] here` }] },
    ],
  };
  transform(tree as never);
  const paragraph = tree.children[0] as { children: { type: string; url?: string }[] };
  // An unresolved link is rewritten to `strong`, which is why a dead link looks like emphasis
  // on the deployed page rather than like an error anywhere.
  return paragraph.children.find((n) => n.type === "link" || n.type === "strong")!;
}

/** The file the validator reaches for the same address.
 *
 * Slugified on the way in because the reader keys its map by slug, while the addresses below are
 * written the way an author writes them — `gxwf validate`, not `gxwf-validate`.
 */
const fileFor = (address: string): string | undefined =>
  index.notesByAddress.get(slugify(address))?.file;

describe("the site resolves what the validator resolves", () => {
  // One per reason a note is addressable: the basename every existing link is written to, the
  // qualified id that cannot collide, and the `tool command` pair a Mold author writes.
  const ADDRESSES = [
    "draft-validate",
    "gxwf-draft-validate",
    "gxwf validate",
    "summarize-nextflow",
    "foundry-summarize-nextflow",
    "foundry summarize-nextflow",
    "custom-tool-critic",
    "galaxy-custom-tool-critic",
  ];

  it.each(ADDRESSES)("renders [[%s]] as a link", (address) => {
    expect(render(address).type).toBe("link");
  });

  it.each(ADDRESSES)("sends [[%s]] to the note the validator resolves it to", (address) => {
    const expected = fileFor(address);
    expect(expected, `validator resolves this address`).toBeDefined();
    // `content/molds/summarize-nextflow/index.md` -> `/foundry/molds/summarize-nextflow/`
    const want = `${BASE}/${expected!.replace(/^content\//, "").replace(/(?:\/index)?\.md$/, "")}/`;
    expect(render(address).url).toBe(want);
  });
});
