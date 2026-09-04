import { z } from "zod";

import { type KindContext, defineKind } from "../context.js";

export const kind = defineKind({
  kind: "prompt",
  title: "Prompt",
  layer: "instance",
  summary:
    "A raw upstream prompt carried verbatim in a sibling file, with the note recording where it came from and under what license.",

  shape: "directory",

  // A prompt note is a directory: `index.md` is the wrapper, and this file beside it is the
  // verbatim upstream text. There is exactly one, at exactly this name — which is why a
  // `prompt_file:` frontmatter field could only ever restate the convention, and a restated
  // convention is a thing that can disagree with itself.
  //
  // This replaces the bare `UPSTREAM_PROMPT_FILE` constant that carried the name until now. The
  // name is no better here than it was there; what is better is that the caster and the validator
  // now read a kind's layout the same way they read every other kind's, so neither has a special
  // case for prompts.
  companions: [
    {
      file: "upstream.prompt",
      requirement: "required",
      purpose: "The verbatim upstream prompt text. Casting packages this, never the wrapper note.",
      disposition: "bundled",
    },
  ],

  build: (ctx: KindContext) =>
    z
      .object({
        ...ctx.base,
        type: z.literal("prompt"),
        title: z.string(),
        license: ctx.licenseId.optional(),
        license_file: ctx.licenseFile.optional(),
      })
      .strict(),
});
