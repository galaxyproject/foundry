// A note's frontmatter is read as the union it is, all the way to the page.
//
// `note-union.test-d.ts` proves the union survives assembly: `note.type === "mold"` narrows, and
// reading `note.axis` without narrowing fails. That guard stops at the package boundary. This one
// carries it the rest of the way, because the site is where the erasure actually happened —
// `const data = entry.data as any` at the top of a component, and every field below it unchecked.
//
// What that costs is not hypothetical, and it is not a type-purity argument:
//
//   - `TYPE_LABELS` was `Record<string, string>` with eight rows for ten kinds. `cli-tool` and
//     `prompt` notes rendered their raw `type` string as the label, on every one of their pages.
//     An exhaustive table would not have compiled.
//   - A component declaring `entry: NoteEntry` accepts a note of ANY kind. `MoldBody` reading
//     `data.phases` off a pattern is a compile error only if the prop says which kind it renders;
//     under `any` it is an empty section.
//
// Both build green, and both are invisible from inside the file that has the mistake.
//
// The rule is the ERASURE, not the correct expression. A component that takes its own kind's entry
// needs no cast; a cross-kind reader narrows with `in`. Neither needs `any`, so any site of it is
// either a kind that has not declared itself or a field that no kind declares.
//
// Scoped to `.data as any` deliberately: casts that have nothing to do with frontmatter — walking
// a JSON Schema, handing zod output to a generic renderer, mdast node surgery — are a different
// question and are not what this rule is about.

import { describe, expect, it } from "vitest";

import { repoRelative, siteSourceCode, siteSourceFiles } from "./site-sources";

// `e.data as any`, `(n.data as any)`, `entry.data as any` — any receiver, any spacing.
const ERASES_FRONTMATTER = /\.data\s+as\s+any\b/;

describe("a note's frontmatter", () => {
  it("is never read through `any`", () => {
    const erasers = siteSourceFiles()
      .filter((file) => ERASES_FRONTMATTER.test(siteSourceCode(file)))
      .map(repoRelative)
      .sort();

    expect(
      erasers,
      "\nthese read note frontmatter through `any`. A component that renders one kind should" +
        " declare that kind — `entry: CollectionEntry<'molds'>` — and a reader that ranges over" +
        " kinds should narrow with `in` or on `type`. Under `any` a field no kind declares reads" +
        " as undefined and renders as nothing.\n\n  " +
        erasers.join("\n  ") +
        "\n"
    ).toEqual([]);
  });
});
