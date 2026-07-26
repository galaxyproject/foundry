import { z } from "zod";

import { type KindContext, defineKind } from "../context.js";

// Prompt-local: the sibling-relative raw prompt file casting copies verbatim.
const promptFile = z
  .string()
  .regex(/^[A-Za-z0-9._/-]+$/, { message: "must be a sibling-relative path" });

export const kind = defineKind({
  kind: "prompt",
  title: "Prompt",
  origin: "instance",
  summary:
    "A raw upstream prompt carried verbatim in a sibling file, with the note recording where it came from and under what license.",

  build: (ctx: KindContext) =>
    z
      .object({
        ...ctx.base,
        type: z.literal("prompt"),
        title: z.string(),
        prompt_file: promptFile,
        license: ctx.licenseId.optional(),
        license_file: ctx.licenseFile.optional(),
      })
      .strict(),
});
