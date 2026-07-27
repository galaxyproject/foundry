import { z } from "zod";

import { type KindContext, defineKind } from "../context.js";

// Pipeline-local: a phase is either a Mold to run or a branch over alternatives. Nothing
// else composes Molds, so the phase grammar stays here.
const branchItem: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    z.string().regex(/^\[\[.+\]\]$/),
    z.string(), // free-text terminal like "user-supplied"
    z.object({ fallthrough: z.string().regex(/^\[\[.+\]\]$/) }).strict(),
  ]),
);

const moldPhase = z
  .object({
    mold: z.string().regex(/^\[\[.+\]\]$/, { message: "must be a [[wiki-link]]" }),
    loop: z.boolean().optional(),
  })
  .strict();

const branchPhase = z
  .object({
    branch: z.string(),
    loop: z.boolean().optional(),
    branches: z.array(branchItem).optional(),
    chain: z.array(branchItem).optional(),
  })
  .strict()
  .refine((p) => p.branches || p.chain, {
    message: "branch phase needs `branches` or `chain`",
  });

const phase = z.union([moldPhase, branchPhase]);

export const kind = defineKind({
  kind: "pipeline",
  title: "Pipeline",
  layer: "instance",
  summary:
    "An ordered end-to-end protocol composing Molds into phases — the optional composition layer, for domains whose work is a journey.",

  build: (ctx: KindContext) =>
    z
      .object({
        ...ctx.base,
        type: z.literal("pipeline"),
        title: z.string(),
        phases: z.array(phase).min(1),
        harness_notes: z.array(z.string().min(10)).optional(),
      })
      .strict(),
});
