import { z } from "zod";

import { sourceKinds, targetKinds, type KindContext, defineKind } from "../context.js";

export const kind = defineKind({
  kind: "source-pattern",
  title: "Source Pattern",
  layer: "instance",
  summary:
    "A shape recurring in one SOURCE ecosystem, held separate from the target-side patterns that implement it.",

  shape: "file",
  companions: [],

  build: (ctx: KindContext) =>
    z
      .object({
        ...ctx.base,
        type: z.literal("source-pattern"),
        title: z.string(),
        source: z.enum(sourceKinds),
        target: z.enum(targetKinds),
        source_pattern_kind: z.enum([
          "moc",
          "channel-shape",
          "operator",
          "lifecycle",
          "review-trigger",
        ]),
        // min(1): a source-side shape nothing implements is an observation, not a pattern.
        // The link is what makes the source/target split navigable in both directions.
        implemented_by_patterns: z.array(ctx.wikiLink).min(1),
        review_triggers: z.array(z.string().min(1)).optional(),
      })
      .strict(),
});
