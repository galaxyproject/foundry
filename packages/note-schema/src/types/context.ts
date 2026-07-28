// The shared kind context — everything a kind directory draws from, in one place.
//
// This is the substrate half of the frontmatter contract. A field primitive lives here when
// MORE THAN ONE kind uses it; a primitive used by exactly one kind lives in that kind's own
// directory, where the only reader who needs it will find it. `base` is the note envelope
// every kind carries.
//
// Kinds receive this rather than importing the registries themselves, so a kind can be tested
// against a synthetic registry — which is the one thing a kind test always needs.

import { type LicensePolicy, isValidLicenseId } from "@galaxy-foundry/license-policy";
import { type TagRegistry } from "@galaxy-foundry/tag-registry";
import { WIKI_LINK_RE } from "@galaxy-foundry/wiki-links";
import { z } from "zod";

import { contractKeys, type ReferenceContract } from "./../reference-contract.js";

export interface BuildKindContextOptions {
  /** Controlled tag vocabulary (meta_tags.yml). Membership is declared by the registry's
   *  facets, so the schema asks the registry rather than matching a prefix itself. */
  tags: TagRegistry;
  /** Reference-contract registries (reference_contract.yml). */
  contract: ReferenceContract;
  /** License → redistribution-policy table (license-policy.yml). */
  licensePolicy: LicensePolicy;
}

/** Source formats this Foundry converts FROM. Shared by `mold` and `source-pattern`. */
export const sourceKinds = [
  "paper",
  "nextflow",
  "cwl",
  "snakemake",
  "interview",
  "freeform",
  "galaxy",
] as const;

/** Formats this Foundry converts TO. Shared by `mold` and `source-pattern`. */
export const targetKinds = ["galaxy", "cwl", "web", "generic"] as const;

export interface KindContext {
  /** The raw registries, for the few cross-field rules that must consult a policy row. */
  registries: BuildKindContextOptions;

  /** A `[[wiki-link]]`. */
  wikiLink: z.ZodString;
  /** One registered tag. */
  tag: z.ZodType<string>;
  /** Repo-relative path under LICENSES/ to a verbatim upstream LICENSE. */
  licenseFile: z.ZodString;
  /** An SPDX id from license-policy.yml, or a `LicenseRef-<slug>` escape hatch. */
  licenseId: z.ZodType<string>;
  /** Package bin / subcommand names. Shared by `schema` and (as a slug) the cli kinds. */
  toolSlug: z.ZodString;
  /** Sibling filenames a multi-file note bundles; casting copies them verbatim. */
  companions: z.ZodType<string[]>;
  /** One entry of a Mold's typed reference manifest. */
  reference: z.ZodType<unknown>;

  /** THE BASE ENVELOPE — the fields every kind in this instance carries. Kinds spread it. */
  base: {
    tags: z.ZodType<string[]>;
    status: z.ZodEnum<["draft", "reviewed", "revised", "stale", "archived"]>;
    created: z.ZodType<Date, z.ZodTypeDef, unknown>;
    revised: z.ZodType<Date, z.ZodTypeDef, unknown>;
    revision: z.ZodNumber;
    ai_generated: z.ZodBoolean;
    summary: z.ZodString;
    title: z.ZodOptional<z.ZodString>;
    aliases: z.ZodOptional<z.ZodArray<z.ZodString>>;
    sources: z.ZodOptional<z.ZodArray<z.ZodString>>;
    related_notes: z.ZodOptional<z.ZodArray<z.ZodString>>;
    related_patterns: z.ZodOptional<z.ZodArray<z.ZodString>>;
    related_molds: z.ZodOptional<z.ZodArray<z.ZodString>>;
  };
}

export function buildKindContext(options: BuildKindContextOptions): KindContext {
  const { tags, contract, licensePolicy } = options;

  // The shape check is the package's regex, not a local copy — the same grammar the site,
  // the validator and the caster resolve against.
  const wikiLink = z.string().regex(WIKI_LINK_RE, { message: "must be a [[wiki-link]]" });

  // Tag membership check (meta_tags.yml): valid iff some facet declares the tag under its
  // `values`. Never a prefix match — `target/not-a-real-thing` is as invalid as `nonsense`,
  // and a bare key like `meta` is as valid as a slashed one.
  const tag = z.string().superRefine((t: string, ctx: z.RefinementCtx) => {
    if (!tags.isValidTag(t)) {
      ctx.addIssue({ code: "custom", message: `unknown tag '${t}' (not in meta_tags.yml)` });
    }
  });

  const licenseId = z.string().refine((v: string) => isValidLicenseId(licensePolicy, v), {
    message: "must be an SPDX id from license-policy.yml or a LicenseRef-<slug>",
  });

  const licenseFile = z.string().regex(/^LICENSES\/[A-Za-z0-9._-]+(\.LICENSE|\.txt)?$/, {
    message: "must be a LICENSES/<file> path",
  });

  const toolSlug = z.string().regex(/^[a-z][a-z0-9-]*$/);

  const companions = z
    .array(z.string().regex(/^[A-Za-z0-9._-]+$/, { message: "must be a sibling filename" }))
    .min(1)
    .refine((a) => new Set(a).size === a.length, { message: "companions must be unique" });

  function registryEnum(group: keyof ReferenceContract) {
    const values = contractKeys(contract, group);
    return z.string().refine((v: string) => values.includes(v), {
      message: `must be one of: ${values.join(", ")}`,
    });
  }

  const reference = z
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
      // Both cross-field rules the reference contract's vocabularies imply. `on-demand`
      // without a `trigger` names no condition under which the cast should read the note,
      // so the reference is unreachable at runtime.
      if (ref.load === "on-demand" && !ref.trigger) {
        ctx.addIssue({
          code: "custom",
          path: ["trigger"],
          message: `on-demand ref "${ref.ref}" requires a trigger`,
        });
      }
      if (ref.evidence === "hypothesis" && !ref.verification) {
        ctx.addIssue({
          code: "custom",
          path: ["verification"],
          message: `hypothesis-evidence ref "${ref.ref}" requires a verification`,
        });
      }
    });

  return {
    registries: options,
    wikiLink,
    tag,
    licenseFile,
    licenseId,
    toolSlug,
    companions,
    reference,
    base: {
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
    },
  };
}

/** Any shape that can be a member of the `type`-discriminated union. */
export type KindShape = { type: z.ZodTypeAny } & z.ZodRawShape;

/**
 * What a `types/<kind>/schema.ts` exports.
 *
 * `build` returns a plain strict ZodObject rather than the refined schema, for two reasons:
 * zod's `discriminatedUnion` only accepts ZodObject members (a `.superRefine` would wrap it
 * in ZodEffects), and the manifest generator walks `.shape` to derive the required-metadata
 * table. Per-kind cross-field rules go in `refine`, which the assembler dispatches by `type`
 * after the union resolves — so the rule still LIVES in the kind's directory.
 */
export interface KindDefinition<T extends KindShape = KindShape> {
  /** The `type:` discriminator value. MUST equal the directory name. */
  kind: string;
  /** Display name for the kind catalog. */
  title: string;
  /** `substrate` = a kind the Foundry pattern's other instances also declare;
   *  `instance` = one this domain added. The cross-instance catalog groups by this.
   *
   *  Named `layer`, not `origin`, because `origin` is already a frontmatter field on the
   *  `cli-tool` kind (`npm | pypi`) — one manifest carrying both meanings under one word is a
   *  trap for anything reading across instances. */
  layer: "substrate" | "instance";
  /** One line: what a note of this kind IS. Rendered in the catalog. */
  summary: string;
  /** A strict object carrying a `type:` literal — a union member, and the `.shape` the
   *  manifest generator walks to derive this kind's required-metadata table. */
  build: (ctx: KindContext) => z.ZodObject<T, "strict">;
  refine?: (data: Record<string, unknown>, ctx: z.RefinementCtx, kctx: KindContext) => void;
}

/**
 * Identity helper a kind directory wraps its definition in.
 *
 * It exists purely to INFER the object shape rather than widen it. Annotating a kind as
 * `: KindDefinition` erases which fields it declares, and that erasure propagates all the way
 * to the Astro site, where `entry.data.tags` degrades to `any`. Inferring keeps each kind's
 * frontmatter type precise for every consumer of the assembled union.
 */
export function defineKind<T extends KindShape>(definition: KindDefinition<T>): KindDefinition<T> {
  return definition;
}
