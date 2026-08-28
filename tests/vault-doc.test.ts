// The glossary renders OUTSIDE the remark pipeline — `marked` over a file no collection owns —
// so `[[Target]]` has to be resolved on the string, before parsing. That path
// carried a local regex, and a regex over raw markdown rewrites inside code spans, where a
// backtick means the syntax. The entry it corrupted is the glossary's definition of a Phase:
//
//     Either Mold-shaped (`mold: **...**`, optionally `loop: true`)
//
// Nothing reported it. The validator strips code spans before scanning too, so the renderer and
// the checker went blind on the same text at once.
//
// Asserted against the REAL glossary rather than a fixture — a fixture would have passed all
// along. Only the link MAP is synthetic, because building the real one needs astro:content.

import { describe, expect, it } from "vitest";

import { renderContentDoc } from "../site/src/lib/render-vault-doc.js";
import type { VaultDocTarget } from "../site/src/lib/render-vault-doc.js";

const BASE = "/foundry";

// One real target, so "a link still resolves" has a baseline in the same file. The glossary
// carries exactly two `[[...]]`: this one in prose, and the backticked one above.
const LINK_MAP = new Map<string, VaultDocTarget>([
  ["open-requirements-ledger", { id: "molds/open-requirements-ledger", summary: "The ledger." }],
]);

// vitest runs from the repo root, an Astro build from site/ — hence the explicit dir.
const CONTENT_DIR = new URL("../content/", import.meta.url).pathname;

const glossary = (): string => renderContentDoc("meta/glossary.md", LINK_MAP, BASE, CONTENT_DIR);

describe("rendering the glossary", () => {
  it("leaves a backticked link as the token it names", () => {
    expect(glossary()).toContain("<code>mold: [[...]]</code>");
  });

  it("leaves no bold fallback stranded inside a code span", () => {
    const stranded = [...glossary().matchAll(/<code>([^<]*)<\/code>/g)]
      .map((m) => m[1] ?? "")
      .filter((code) => code.includes("**"));
    expect(stranded, `\ncode spans carrying a bold fallback: ${stranded.join(", ")}`).toEqual([]);
  });

  it("still resolves a real wiki link in prose", () => {
    expect(glossary()).toContain(`<a href="${BASE}/molds/open-requirements-ledger/"`);
  });

  it("still mints an anchor id per term, so #term deep links resolve", () => {
    expect(glossary()).toContain('<p id="phase">');
  });
});
