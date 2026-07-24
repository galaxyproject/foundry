// The single source of truth for Foundry note frontmatter. This zod schema
// replaces the former hand-written meta_schema.yml (ajv) + site zod pair; the
// validator (`@galaxy-foundry/build-cli`) and the Astro site both build it from
// the same three registries so the two encodings can no longer drift.
//
// `buildNoteSchema` is a factory: the controlled enums (tags, reference-contract
// vocab, license ids) live in YAML registries loaded at call time and injected
// here, mirroring how the old validator injected them into the JSON Schema.

import { z } from "zod";

import { contractKeys, type ReferenceContract } from "./reference-contract.js";
import { isValidLicenseId, resolveLicenseRow, type LicensePolicy } from "./license-policy.js";

export interface BuildNoteSchemaOptions {
  /** Controlled tag vocabulary (meta_tags.yml keys). */
  tags: string[];
  /** Reference-contract registries (reference_contract.yml). */
  contract: ReferenceContract;
  /** License → redistribution-policy table (license-policy.yml). */
  licensePolicy: LicensePolicy;
}

const wikiLink = z.string().regex(/^\[\[.+\]\]$/, { message: "must be a [[wiki-link]]" });

// Sibling-relative raw prompt file consumed by casting.
const promptFile = z
  .string()
  .regex(/^[A-Za-z0-9._/-]+$/, { message: "must be a sibling-relative path" });

// Repo-relative path under LICENSES/ to a verbatim upstream LICENSE.
const licenseFile = z.string().regex(/^LICENSES\/[A-Za-z0-9._-]+(\.LICENSE|\.txt)?$/, {
  message: "must be a LICENSES/<file> path",
});

// Package bin / subcommand names.
const binName = z.string().regex(/^[A-Za-z0-9._-]+$/);

// Sibling filenames a multi-file note bundles; casting copies them verbatim.
const companions = z
  .array(z.string().regex(/^[A-Za-z0-9._-]+$/, { message: "must be a sibling filename" }))
  .min(1)
  .refine((a) => new Set(a).size === a.length, { message: "companions must be unique" });

const artifactId = z.string().regex(/^[a-z][a-z0-9-]*$/, { message: "must be a kebab id" });
const toolSlug = z.string().regex(/^[a-z][a-z0-9-]*$/);
const sourceKinds = [
  "paper",
  "nextflow",
  "cwl",
  "snakemake",
  "interview",
  "freeform",
  "galaxy",
] as const;

export function buildNoteSchema({ tags, contract, licensePolicy }: BuildNoteSchemaOptions) {
  const tagSet = new Set(tags);

  // Tag membership check (meta_tags.yml). Mirrors the old ajv tags.items.enum.
  const tag = z.string().superRefine((t: string, ctx: z.RefinementCtx) => {
    if (!tagSet.has(t)) {
      ctx.addIssue({ code: "custom", message: `unknown tag '${t}' (not in meta_tags.yml)` });
    }
  });

  // SPDX id from license-policy.yml, or a LicenseRef-<slug> escape hatch.
  const licenseId = z.string().refine((v: string) => isValidLicenseId(licensePolicy, v), {
    message: "must be an SPDX id from license-policy.yml or a LicenseRef-<slug>",
  });

  function registryEnum(group: keyof ReferenceContract) {
    const values = contractKeys(contract, group);
    return z.string().refine((v: string) => values.includes(v), {
      message: `must be one of: ${values.join(", ")}`,
    });
  }

  const typedReference = z
    .object({
      kind: registryEnum("kinds"),
      ref: z.string().min(1),
      used_at: registryEnum("used_at"),
      load: registryEnum("load"),
      mode: registryEnum("modes"),
      evidence: registryEnum("evidence"),
      purpose: z.string().min(1).optional(),
      trigger: z.string().min(1).optional(),
      verification: z.string().min(1).optional(),
    })
    .strict()
    .superRefine((ref, ctx) => {
      if (ref.evidence === "hypothesis" && !ref.verification) {
        ctx.addIssue({ code: "custom", message: "hypothesis references require `verification`" });
      }
    });

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

  const baseFields = {
    tags: z.array(tag).min(1),
    status: z.enum(["draft", "reviewed", "revised", "stale", "archived"]),
    created: z.coerce.date(),
    revised: z.coerce.date(),
    revision: z.number().int().min(1),
    ai_generated: z.boolean(),
    summary: z.string().min(20).max(160),
    title: z.string().optional(),
    aliases: z.array(z.string()).optional(),
    sources: z.array(z.string().min(1)).min(1).optional(),
    related_notes: z.array(wikiLink).optional(),
    related_patterns: z.array(wikiLink).optional(),
    related_molds: z.array(wikiLink).optional(),
  };

  // Pipeline phase: Mold-shape or branch-shape. Branch can have branches[] or chain[].
  const branchItem: z.ZodType<unknown> = z.lazy(() =>
    z.union([
      wikiLink,
      z.string(), // free-text terminal like "user-supplied"
      z.object({ fallthrough: wikiLink }).strict(),
    ]),
  );

  const moldPhase = z
    .object({
      mold: wikiLink,
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

  const outputArtifact = z
    .object({
      id: artifactId,
      kind: z.enum(["json", "markdown", "yaml", "text", "other"]),
      default_filename: z.string().min(1),
      schema: wikiLink.optional(),
      description: z.string().min(20),
    })
    .strict();

  const inputArtifact = z
    .object({
      id: artifactId,
      description: z.string().min(20),
    })
    .strict();

  const moldSchema = z
    .object({
      type: z.literal("mold"),
      name: z.string(),
      axis: z.enum(["source-specific", "target-specific", "tool-specific", "generic"]),
      source: z.enum(sourceKinds).optional(),
      target: z.enum(["galaxy", "cwl", "web", "generic"]).optional(),
      tool: z
        .string()
        .regex(/^[a-z][a-z0-9-]*$/)
        .optional(),
      output_artifacts: z.array(outputArtifact).optional(),
      input_artifacts: z.array(inputArtifact).optional(),
      loop_endstate: z.string().min(10).optional(),
      references: z.array(typedReference).optional(),
      ...baseFields,
    })
    .strict();

  const patternSchema = z
    .object({
      ...baseFields,
      type: z.literal("pattern"),
      pattern_kind: z.enum(["operation", "recipe", "moc"]),
      evidence: z.enum([
        "corpus-observed",
        "structurally-verified",
        "corpus-and-verified",
        "hypothesis",
      ]),
      title: z.string(),
      parent_pattern: wikiLink.optional(),
      verification_paths: z.array(z.string()).optional(),
      iwc_exemplars: z.array(iwcExemplar).optional(),
      companions: companions.optional(),
    })
    .strict();

  const sourcePatternSchema = z
    .object({
      ...baseFields,
      type: z.literal("source-pattern"),
      title: z.string(),
      source: z.enum(sourceKinds),
      target: z.enum(["galaxy", "cwl", "web", "generic"]),
      source_pattern_kind: z.enum([
        "moc",
        "channel-shape",
        "operator",
        "lifecycle",
        "review-trigger",
      ]),
      implemented_by_patterns: z.array(wikiLink).min(1),
      review_triggers: z.array(z.string().min(1)).optional(),
    })
    .strict();

  const cliCommandSchema = z
    .object({
      type: z.literal("cli-command"),
      tool: toolSlug,
      command: z.string(),
      package: z.string().optional(),
      upstream: z.string().optional(),
      ...baseFields,
    })
    .strict();

  const cliToolSchema = z
    .object({
      type: z.literal("cli-tool"),
      tool: toolSlug,
      origin: z.enum(["npm", "pypi"]),
      package: z.string(),
      package_version: z.string().optional(),
      invoke: z.string().regex(/^[A-Za-z0-9._-]+$/),
      invoke_fallback: z.string().optional(),
      availability_check: z.string().optional(),
      docs_url: z.string().optional(),
      ...baseFields,
    })
    .strict();

  const pipelineSchema = z
    .object({
      ...baseFields,
      type: z.literal("pipeline"),
      title: z.string(),
      phases: z.array(phase).min(1),
      harness_notes: z.array(z.string().min(10)).optional(),
    })
    .strict();

  const researchSchema = z
    .object({
      type: z.literal("research"),
      component: z.string().optional(),
      companions: companions.optional(),
      license: licenseId.optional(),
      license_file: licenseFile.optional(),
      ...baseFields,
    })
    .strict();

  const schemaNoteSchema = z
    .object({
      ...baseFields,
      type: z.literal("schema"),
      name: z.string(),
      title: z.string(),
      package: z.string().optional(),
      upstream: z.string().optional(),
      package_export: z.string().optional(),
      validator_bin: binName.optional(),
      validator_subcommand: binName.optional(),
      license: licenseId.optional(),
      license_file: licenseFile.optional(),
    })
    .strict();

  const promptSchema = z
    .object({
      ...baseFields,
      type: z.literal("prompt"),
      title: z.string(),
      prompt_file: promptFile,
      license: licenseId.optional(),
      license_file: licenseFile.optional(),
    })
    .strict();

  return z
    .discriminatedUnion("type", [
      moldSchema,
      patternSchema,
      sourcePatternSchema,
      cliToolSchema,
      cliCommandSchema,
      pipelineSchema,
      researchSchema,
      schemaNoteSchema,
      promptSchema,
    ])
    .superRefine((d, ctx) => {
      if (d.type === "mold") {
        if (d.axis === "source-specific" && !d.source)
          ctx.addIssue({ code: "custom", message: "source-specific mold requires `source`" });
        if (d.axis === "target-specific" && !d.target)
          ctx.addIssue({ code: "custom", message: "target-specific mold requires `target`" });
        if (d.axis === "tool-specific" && !d.tool)
          ctx.addIssue({ code: "custom", message: "tool-specific mold requires `tool`" });
        return;
      }
      // Schema notes redistributing external upstream content must carry a license,
      // and (for verbatim-carry licenses) a license_file. Mirrors the validator.
      if (d.type === "schema") {
        const upstream = d.upstream ?? "";
        const external = upstream && !upstream.includes("github.com/galaxyproject/foundry/");
        if (!external) return;
        if (!d.license) {
          ctx.addIssue({
            code: "custom",
            message: "vendored schema with external upstream requires `license`",
          });
          return;
        }
        if (resolveLicenseRow(licensePolicy, d.license).license_file && !d.license_file) {
          ctx.addIssue({
            code: "custom",
            message: `license ${d.license} requires a \`license_file\``,
          });
        }
      }
    });
}

export type NoteSchema = ReturnType<typeof buildNoteSchema>;
