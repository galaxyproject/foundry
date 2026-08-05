// The base this site is deployed at is read from the environment in exactly one module.
//
// Thirty-eight files used to read it for themselves, every one of them writing the same line:
// `import.meta.env.BASE_URL.replace(/\/$/, '')`. That is thirty-eight private answers to a
// question the shell also answers, and the shell's answer is the one the header and footer resolve
// their links against. While the answers agree nothing is visible; the day one of them stops
// agreeing, half the page points somewhere the other half does not.
//
// It is not only drift. Two shapes of this are wrong the moment they are written, and both build
// green:
//
//   - reading BASE_URL without stripping. At the domain root it is `/`, the strip is a no-op, and
//     every href comes out right — so dev and any root deploy confirm the bug. Under `/foundry/`
//     the same code emits `/foundry//patterns/`.
//   - stripping with something subtly different, e.g. trimming a leading slash too. Nothing here
//     renders an error; the links simply land somewhere else.
//
// So the rule is the single reader, not the correct expression: `site/src/lib/site-base.ts`, which
// takes the definition from `shellBase` in @galaxy-foundry/site-kit — the same function the shell
// resolves the nav with. Everything else imports `base` from there.

import { describe, expect, it } from "vitest";

import { repoRelative, siteSourceCode, siteSourceFiles } from "./site-sources";

const READER = "site/src/lib/site-base.ts";

describe("the deployment base", () => {
  it("is read from the environment in one module", () => {
    const readers = siteSourceFiles()
      .filter((file) => siteSourceCode(file).includes("import.meta.env.BASE_URL"))
      .map(repoRelative)
      .sort();

    expect(
      readers,
      `\nOnly ${READER} may read BASE_URL. Import \`base\` from it instead — the shell resolves` +
        ` its own links against that value, and a second reading of the environment is a second` +
        ` answer that renders identically until it does not.\n\n  ${readers.join("\n  ")}\n`
    ).toEqual([READER]);
  });
});
