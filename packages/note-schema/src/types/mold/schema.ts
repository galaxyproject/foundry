import { WIKI_LINK_RE } from "@galaxy-foundry/wiki-links";
import { z } from "zod";

import { sourceKinds, targetKinds, type KindContext, defineKind } from "../context.js";

// Mold-local primitives: the declared IO of one casting action. Nothing else declares
// artifacts, so they stay here rather than in the shared context.
const artifactId = z.string().regex(/^[a-z][a-z0-9-]*$/, { message: "must be a kebab id" });

const outputArtifact = z
  .object({
    id: artifactId,
    kind: z.enum(["json", "markdown", "yaml", "text", "other"]),
    default_filename: z.string().min(1),
    schema: z.string().regex(WIKI_LINK_RE).optional(),
    description: z.string().min(20),
  })
  .strict();

const inputArtifact = z
  .object({
    id: artifactId,
    description: z.string().min(20),
  })
  .strict();

export const kind = defineKind({
  kind: "mold",
  title: "Mold",
  layer: "substrate",
  summary:
    "One repeatable action, described as a typed reference manifest that casting compiles into a skill artifact.",

  shape: "directory",

  // Transcribed from the file-roles table `docs/MOLD_SPEC.md` used to carry, which now reads FROM
  // here. Two copies of a layout is how the copy nobody runs drifts from the one that is enforced,
  // and this one is enforced: `validateCompanionLayout` checks a mold directory against exactly
  // these names, and `_target.yml`'s forbidden-files list is derived from their dispositions.
  //
  // `eval.md` and `scenarios.md` are `recommended` rather than `required` because the spec calls
  // them "strongly recommended, warning-only for now" and 33 and 27 of 47 molds have them. The
  // level records the state honestly instead of choosing between a rule that fails 14 molds and
  // one that says these files are merely nice to have.
  companions: [
    {
      file: "eval.md",
      requirement: "recommended",
      purpose: "Abstract oracle: the properties any cast of this Mold must satisfy.",
      disposition: "foundry-only",
    },
    {
      file: "scenarios.md",
      requirement: "recommended",
      purpose: "Concrete cases bound to fixtures, run against the eval properties.",
      disposition: "foundry-only",
    },
    {
      file: "refinement.md",
      requirement: "optional",
      purpose: "Standing notes for `/refine-mold`: what to reconsider on the next pass.",
      disposition: "foundry-only",
    },
    {
      file: "refinements/",
      requirement: "optional",
      purpose: "Dated `/refine-mold` journal. Entries carry their own frontmatter.",
      disposition: "foundry-only",
    },
    {
      file: "changes.md",
      requirement: "optional",
      purpose: "Reviewer-facing log of what changed in this Mold and why.",
      disposition: "foundry-only",
    },
    {
      file: "casting.md",
      requirement: "optional",
      purpose: "Per-Mold condensation prompts, read by `/cast` when a reference casts condensed.",
      disposition: "cast-input",
    },
    {
      file: "cast-skill-verification.md",
      requirement: "optional",
      purpose: "Instructions for the agentic review that runs after a cast.",
      disposition: "cast-input",
    },
    {
      file: "examples/",
      requirement: "optional",
      purpose: "Fixtures cited by index.md or eval.md. Carried into a cast only when referenced.",
      disposition: "bundled",
    },
    {
      file: "README.md",
      requirement: "optional",
      purpose: "Orientation for someone opening the directory. Not part of the Mold contract.",
      disposition: "foundry-only",
    },
  ],

  build: (ctx: KindContext) =>
    z
      .object({
        type: z.literal("mold"),
        name: z.string(),
        // Which dimension the Mold is specialized along. The `refine` below makes each
        // value require the field that names the specialization — an axis that names no
        // subject is a Mold nothing can be selected by.
        axis: z.enum(["source-specific", "target-specific", "tool-specific", "generic"]),
        source: z.enum(sourceKinds).optional(),
        target: z.enum(targetKinds).optional(),
        tool: ctx.toolSlug.optional(),
        output_artifacts: z.array(outputArtifact).optional(),
        input_artifacts: z.array(inputArtifact).optional(),
        loop_endstate: z.string().min(10).optional(),
        references: z.array(ctx.reference).optional(),
        ...ctx.base,
      })
      .strict(),

  refine: (d, ctx) => {
    if (d.axis === "source-specific" && !d.source)
      ctx.addIssue({
        code: "custom",
        path: ["source"],
        message: "source-specific mold requires `source`",
      });
    if (d.axis === "target-specific" && !d.target)
      ctx.addIssue({
        code: "custom",
        path: ["target"],
        message: "target-specific mold requires `target`",
      });
    if (d.axis === "tool-specific" && !d.tool)
      ctx.addIssue({
        code: "custom",
        path: ["tool"],
        message: "tool-specific mold requires `tool`",
      });
  },
});
