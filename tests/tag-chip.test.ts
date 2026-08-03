// One chip for one concept, asserted on the markup that asks for it.
//
// A tag chip is styled entirely by `.tag` in global.css, and every rule it has — the pill, the
// size, the hover — is a rule a call site can simply not opt into. That is the whole failure mode:
// a link to a tag page that spells its own appearance out inline renders a chip, on the right
// page, in the right place, with the right text. It is a different chip, and nothing says so. The
// build is green, the page is valid, and the only witness is a reader who happens to see both
// versions at once.
//
// Which is what shipped. `tags/[...tag].astro` rendered `.tag` in its heading and, nine lines
// down, a hand-rolled pill with a different background and a border it invented — one page, two
// chips. Meanwhile `patterns/index.astro` used `.tag` correctly and still had no hover, because
// the hover rule was `a:hover .tag` and there the anchor IS the chip, which no descendant selector
// can reach. Three renderings, three behaviours, one concept.
//
// The rule is about the ANCHOR, not the geometry. Geometry cannot be the rule here: `border-radius:
// 999px` appears in nine components as a local idiom for rails, dots and bars, so "the pill is
// defined once" is not true of this site and asserting it would pass for a reason that has nothing
// to do with tags. What IS true is that a link to a tag page hands its appearance to a class the
// stylesheet owns, and there are exactly two of those.

import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { REPO_ROOT, repoRelative, siteSourceCode, siteSourceFiles } from "./site-sources";

const STYLESHEET = "site/src/styles/global.css";

/**
 * The classes a link to a tag page may render as.
 *
 * `topic-chip` is the second one and it is not drift. The patterns index rolls topics up into a
 * browse row — navigation, sized and spaced to be aimed at, not metadata sitting under a title —
 * and it is scoped to that page because that is the only place the affordance exists. It is named
 * here rather than left to fall outside the rule, because a rule with a silent gap and a rule with
 * a stated exception look identical from the outside and only one of them is honest. A third entry
 * is the signal to stop and ask what concept it is: two affordances is a design, three is drift
 * that has learned to name itself.
 */
const CHIP_CLASSES = ["tag", "topic-chip"];

/** Opening `<a>` tags whose attributes name a tag-page path. */
const TAG_LINK = /<a\s[^>]*\/tags\//g;
const STATIC_CLASS = /class="([^"]*)"/g;

/** Every `<a … /tags/… >` in a file, paired with the markup it encloses and its own attributes. */
function tagLinks(file: string): { file: string; markup: string; opening: string }[] {
  const code = siteSourceCode(file);
  return [...code.matchAll(TAG_LINK)].map((match) => {
    const end = code.indexOf("</a>", match.index);
    // An anchor cannot nest, so the first close is this one's. An unclosed anchor is a real
    // defect; reporting the tail is how it surfaces rather than silently matching nothing.
    const markup = end === -1 ? code.slice(match.index) : code.slice(match.index, end);
    const close = markup.indexOf(">");
    return { file, markup, opening: close === -1 ? markup : markup.slice(0, close) };
  });
}

const classesIn = (markup: string): string[] =>
  [...markup.matchAll(STATIC_CLASS)].flatMap((match) => (match[1] ?? "").split(/\s+/));

describe("the tag chip", () => {
  const links = siteSourceFiles().flatMap(tagLinks);

  it("is asked for by every link to a tag page", () => {
    // Guards the guard: a regex that stops matching would make the rule below vacuously true,
    // and a chip rule with no chips to check reports the same PASS as a site with no drift.
    expect(links.length).toBeGreaterThan(3);

    const inline = links
      .filter((link) => !classesIn(link.markup).some((name) => CHIP_CLASSES.includes(name)))
      .map((link) => repoRelative(link.file));

    expect(
      [...new Set(inline)].sort(),
      `\nlinks to a tag page carrying none of ${CHIP_CLASSES.map((c) => `\`${c}\``).join(" or ")}` +
        " — they render a chip of their own, which will drift from the ones in" +
        " site/src/styles/global.css without anything failing. A dynamic `class={…}` lands here" +
        " too: the rule cannot read it, and a call site a rule cannot read is not a call site a" +
        " rule covers.",
    ).toEqual([]);
  });

  it("lights up on hover in whichever way its call sites nest it", () => {
    // The defect the rule above cannot see, because the markup that carried it was correct.
    // `patterns/index.astro` wrote `<a class="tag">` against a stylesheet whose only hover rule
    // was `a:hover .tag` — a descendant selector, which an anchor that IS the chip can never
    // satisfy. It kept the transition and lost the thing to transition to. No warning: a chip
    // that does not react looks like a chip you have not moused over yet.
    //
    // Both nestings are legitimate and the site needs both — the tags index wraps the chip AND
    // the note count in one anchor, so there is nothing there to collapse. So the requirement is
    // derived from the markup rather than declared: whichever nestings the call sites actually
    // use, the stylesheet has to cover. Delete either selector and this names the pages that go
    // quiet.
    const css = readFileSync(path.join(REPO_ROOT, STYLESHEET), "utf-8");
    const selectorFor = { self: "a.tag:hover", descendant: "a:hover .tag" };

    const missing = links
      .filter((link) => classesIn(link.markup).includes("tag"))
      .map((link): keyof typeof selectorFor =>
        classesIn(link.opening).includes("tag") ? "self" : "descendant",
      )
      .filter((nesting) => !css.includes(selectorFor[nesting]))
      .map((nesting) => selectorFor[nesting]);

    expect(
      [...new Set(missing)].sort(),
      `\nnestings the markup uses that ${STYLESHEET} has no hover rule for. The chips render` +
        " correctly and simply do not respond, which is invisible unless the two forms happen to" +
        " sit on one page.",
    ).toEqual([]);
  });
});
