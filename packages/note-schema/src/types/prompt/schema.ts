import { z } from "zod";

import { type KindContext, defineKind } from "../context.js";

/**
 * The raw prompt file, named by convention rather than by frontmatter.
 *
 * A prompt note is a directory: `index.md` is the note, and this file beside it is the
 * verbatim upstream text. There is exactly one, at exactly this name, so a `prompt_file:`
 * field could only ever restate the convention — and a restated convention is a thing that
 * can disagree with itself. The name is here, next to the kind it belongs to, because that
 * is where a per-kind declaration of companion files will go when one exists.
 */
export const UPSTREAM_PROMPT_FILE = "upstream.prompt";

export const kind = defineKind({
  kind: "prompt",
  title: "Prompt",
  layer: "instance",
  summary:
    "A raw upstream prompt carried verbatim in a sibling file, with the note recording where it came from and under what license.",

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
