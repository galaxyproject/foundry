import { z } from "zod";

import { type KindContext, defineKind } from "../context.js";

export const kind = defineKind({
  kind: "research",
  title: "Research Note",
  origin: "instance",
  summary:
    "A captured finding about the domain or its tooling — the grounding a Mold cites rather than inventing.",

  build: (ctx: KindContext) =>
    z
      .object({
        type: z.literal("research"),
        component: z.string().optional(),
        companions: ctx.companions.optional(),
        license: ctx.licenseId.optional(),
        license_file: ctx.licenseFile.optional(),
        ...ctx.base,
      })
      .strict(),
});
