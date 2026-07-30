import { WIKI_LINK_RE } from "@galaxy-foundry/wiki-links";
import { z } from "zod";

import { type KindContext, defineKind } from "../context.js";

// Pipeline-local: a phase is either a Mold to run or a branch over alternatives. Nothing
// else composes Molds, so the phase grammar stays here.
const branchItem: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    z.string().regex(WIKI_LINK_RE),
    z.string(), // free-text terminal like "user-supplied"
    z.object({ fallthrough: z.string().regex(WIKI_LINK_RE) }).strict(),
  ]),
);

const moldPhase = z
  .object({
    mold: z.string().regex(WIKI_LINK_RE, { message: "must be a [[wiki-link]]" }),
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

  shape: "directory",

  // The same companion vocabulary a mold uses, minus the authoring journal — and this is the first
  // time a pipeline's layout is written down anywhere, since `content/meta/mold-spec.md` is mold-only.
  //
  // Duplicated from `mold` rather than shared. Two call sites is not yet a pattern, and a shared
  // companion set would have to decide what happens when one kind wants one more file — which is a
  // mechanism, and the whole point here is that a declaration beats a mechanism until a third
  // caller shows up.
  companions: [
    {
      file: "eval.md",
      requirement: "recommended",
      purpose: "Abstract oracle for the pipeline as a whole, above the per-Mold evals.",
      disposition: "foundry-only",
    },
    {
      file: "scenarios.md",
      requirement: "recommended",
      purpose: "End-to-end cases bound to fixtures, walking every phase.",
      disposition: "foundry-only",
    },
    {
      file: "examples/",
      requirement: "optional",
      purpose: "Fixtures the scenarios cite — source workflows, issue write-ups, expected outputs.",
      disposition: "bundled",
    },
    {
      file: "README.md",
      requirement: "optional",
      purpose: "Orientation for someone opening the directory.",
      disposition: "foundry-only",
    },
  ],

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
