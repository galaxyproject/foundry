import { z } from "zod";

import { type KindContext, defineKind } from "../context.js";

// Pattern-local: a citation into the IWC corpus, naming the workflow (and optionally the
// steps) that exhibit the pattern. Only patterns carry corpus exemplars.
const iwcExemplarStep = z
  .object({
    label: z.string().min(1).optional(),
    id: z.union([z.string().min(1), z.number().int()]).optional(),
  })
  .strict()
  .refine((step) => step.label || step.id !== undefined, {
    message: "step needs `label` or `id`",
  });

const iwcExemplar = z
  .object({
    workflow: z.string().min(1),
    steps: z.array(iwcExemplarStep).min(1).optional(),
    why: z.string().min(1),
    confidence: z.enum(["high", "medium", "low"]),
  })
  .strict();

export const kind = defineKind({
  kind: "pattern",
  title: "Pattern",
  layer: "substrate",
  summary:
    "One reusable piece of domain knowledge a Mold can reference, graded by how strongly the corpus supports it.",

  build: (ctx: KindContext) =>
    z
      .object({
        ...ctx.base,
        type: z.literal("pattern"),
        pattern_kind: z.enum(["operation", "recipe", "moc"]),
        // How well-supported the claim is. `hypothesis` is legal but must be declared —
        // an unmarked guess is the failure mode this field exists to prevent.
        evidence: z.enum([
          "corpus-observed",
          "structurally-verified",
          "corpus-and-verified",
          "hypothesis",
        ]),
        title: z.string(),
        parent_pattern: ctx.wikiLink.optional(),
        verification_paths: z.array(z.string()).optional(),
        iwc_exemplars: z.array(iwcExemplar).optional(),
        companions: ctx.companions.optional(),
      })
      .strict(),
});
