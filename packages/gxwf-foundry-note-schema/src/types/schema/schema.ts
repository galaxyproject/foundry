import { resolveLicenseRow } from "@galaxy-foundry/license-policy";
import { z } from "zod";

import { type KindContext, defineKind } from "../context.js";

// Schema-local: package bin / subcommand names for the validator this note documents.
const binName = z.string().regex(/^[A-Za-z0-9._-]+$/);

export const kind = defineKind({
  kind: "schema",
  title: "Schema Note",
  layer: "instance",
  summary:
    "A machine-checkable contract a cast can validate against, plus the validator that decides it.",

  // Flat, despite being the kind most about a file: the schema document itself is a `references:`
  // payload resolved through `source_url` or a vendored path, not a sibling of the note.
  shape: "file",
  companions: [],

  build: (ctx: KindContext) =>
    z
      .object({
        ...ctx.base,
        type: z.literal("schema"),
        name: z.string(),
        title: z.string(),
        package: z.string().optional(),
        upstream: z.string().optional(),
        package_export: z.string().optional(),
        validator_bin: binName.optional(),
        validator_subcommand: binName.optional(),
        // Which package SHIPS the bin, when that is not the package the export comes from.
        // `package` names the export source; usually the same package also ships the CLI, and
        // this is omitted. `summary-nextflow` is the case that is not: its schema is exported
        // by @galaxy-foundry/summarize-nextflow while `foundry validate-summary-nextflow`
        // ships in @galaxy-foundry/gxwf-foundry.
        validator_package: z.string().optional(),
        license: ctx.licenseId.optional(),
        license_file: ctx.licenseFile.optional(),
      })
      .strict(),

  // A schema note vendoring an EXTERNAL upstream is redistributing someone else's work, so
  // it must name the license, and (where the policy row says the text travels with it) point
  // at the vendored copy. An upstream inside this repo is our own and needs neither.
  refine: (d, ctx, kctx) => {
    const external = d.upstream && !d.upstream.includes("github.com/galaxyproject/foundry/");
    if (!external) return;
    if (!d.license) {
      ctx.addIssue({
        code: "custom",
        path: ["license"],
        message: "vendored schema with external upstream requires `license`",
      });
      return;
    }
    const row = resolveLicenseRow(kctx.registries.licensePolicy, d.license);
    if (row.license_file && !d.license_file) {
      ctx.addIssue({
        code: "custom",
        path: ["license_file"],
        message: `license ${d.license} requires a \`license_file\``,
      });
    }
  },
});
