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
    schema: z
      .string()
      .regex(/^\[\[.+\]\]$/)
      .optional(),
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
