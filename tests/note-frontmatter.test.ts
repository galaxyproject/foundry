// A note's frontmatter is read as the union it is, all the way to the page.
//
// `note-union.test-d.ts` proves the union survives assembly: `note.type === "mold"` narrows, and
// reading `note.axis` without narrowing fails. That guard stops at the package boundary. This one
// carries it the rest of the way, because the site is where the erasure actually happened.
//
// What it costs is not a type-purity argument. Under `any`, all of these built green:
//
//   - `TYPE_LABELS` was `Record<string, string>` with eight rows for ten kinds. `cli-tool` and
//     `prompt` notes rendered their raw `type` string as the label, on every one of their pages.
//     An exhaustive table would not have compiled.
//   - A component declaring `entry: NoteEntry` accepts a note of ANY kind. `PipelineBody` reading
//     `data.phases` off a mold is a compile error only if the prop says which kind it renders;
//     under `any` it is an empty section.
//   - `MoldHealth` asked `ref?.load === 'on-demand' && !ref.trigger` of an `any`. Rename `trigger`
//     in the kind and every mold reports a clean health panel — the failure state and the healthy
//     state are the same pixels.
//
// THE RULE IS THE ERASURE, NOT THE CORRECT EXPRESSION. A component that renders one kind declares
// it and needs no cast; a reader that ranges over kinds narrows with `in` or on `type`. So a site
// of `any` is either a kind that has not declared itself or a field no kind declares.
//
// TWO SPELLINGS, because the first version of this rule only caught one and eleven live sites of
// the other survived it. `entry.data as any` is the obvious form; `(ref: any) =>` on a callback
// over a value that CAME from frontmatter, or `phases: any[]` as a prop type, erases exactly the
// same thing one line further from the word `data`. Rather than chase spellings, the second rule
// asks where `any` appears at all and names the files allowed to say it — the same shape as
// `site-base.test.ts`, where the assertion is the file list rather than the expression.
//
// (`no-explicit-any` would be the ordinary way to ask this, and it does not reach: eslint.config.js
// ignores `site/` entirely. Worth revisiting; until then the rule lives here.)

import { describe, expect, it } from "vitest";

import { repoRelative, siteSourceCode, siteSourceFiles } from "./site-sources";

// `e.data as any`, `(n.data as any)`, `entry.data as any` — any receiver, any spacing.
const ERASES_FRONTMATTER = /\.data\s+as\s+any\b/;

// `any` in TYPE POSITION: `as any`, `: any`, `any[]`, `Record<string, any>`. Not the English word,
// which a first version of this rule matched — and page copy says it: "install like any Foundry
// cast skill". `siteSourceCode` removes comments, not the prose a page renders, so a rule read
// over `.astro` files has to distinguish the two itself.
const ERASES_BY_ANNOTATION = /\bas any\b|:\s*any\b|\bany\[\]|,\s*any>/;

// The one module that walks data this repo does not define the shape of. A JSON Schema's nodes are
// whatever the document says, so `any` there describes the world accurately rather than declining
// to describe it. Frontmatter is the opposite: its shape is ours, declared, and available.
//
// `remark-vendored-myst.ts` and `schema-registry.ts` do the same kind of work and are NOT here,
// because they say `as unknown as` instead — a narrower escape this rule does not ask about. That
// is a gap, and naming it is cheaper than pretending the list is the whole story.
const WALKS_FOREIGN_SHAPES = ["site/src/components/SchemaBody.astro"];

describe("a note's frontmatter", () => {
  it("is never read through `any`", () => {
    const erasers = siteSourceFiles()
      .filter((file) => ERASES_FRONTMATTER.test(siteSourceCode(file)))
      .map(repoRelative)
      .sort();

    expect(
      erasers,
      "\nthese read note frontmatter through `any`. A component that renders one kind should" +
        " declare that kind — `entry: NoteOf<'molds'>` — and a reader that ranges over kinds" +
        " should narrow with `in` or on `type`. Under `any` a field no kind declares reads as" +
        " undefined and renders as nothing.\n\n  " +
        erasers.join("\n  ") +
        "\n"
    ).toEqual([]);
  });

  it("is not erased a second time by an untyped callback or prop", () => {
    const sayers = siteSourceFiles()
      .filter((file) => ERASES_BY_ANNOTATION.test(siteSourceCode(file)))
      .map(repoRelative)
      .sort();

    expect(
      sayers,
      "\n`any` in the site outside the modules that walk foreign shapes. The rule above catches" +
        " `entry.data as any` and nothing else, so it missed `(ref: any) =>` over a mold's" +
        " references and `phases: any[]` as a prop — the same erasure, one line further from the" +
        " word `data`, and the second one threw away a type the caller had already got right." +
        " If a new module genuinely walks a shape this repo does not define, add it to" +
        " WALKS_FOREIGN_SHAPES and say why in a comment there.\n\n  " +
        sayers.join("\n  ") +
        "\n"
    ).toEqual(WALKS_FOREIGN_SHAPES);
  });
});
