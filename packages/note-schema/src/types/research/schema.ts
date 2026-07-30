import { z } from "zod";

import { type KindContext, defineKind } from "../context.js";

export const kind = defineKind({
  kind: "research",
  title: "Research Note",
  layer: "instance",
  summary:
    "A captured finding about the domain or its tooling — the grounding a Mold cites rather than inventing.",

  // Still flat, so still nothing declarable — which is exactly why this kind keeps the per-note
  // `companions:` frontmatter field for now. Turning research into a directory kind is what lets
  // that field go, and it is a 63-note migration of its own.
  shape: "file",
  companions: [],

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
