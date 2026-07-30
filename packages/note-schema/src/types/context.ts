// The shared kind context — everything a kind directory draws from, in one place.
//
// This is the substrate half of the frontmatter contract. A field primitive lives here when
// MORE THAN ONE kind uses it; a primitive used by exactly one kind lives in that kind's own
// directory, where the only reader who needs it will find it. `base` is the note envelope
// every kind carries.
//
// Kinds receive this rather than importing the registries themselves, so a kind can be tested
// against a synthetic registry — which is the one thing a kind test always needs.

import {
  kindDefiner,
  type AnyKindDefinition as LibAnyKindDefinition,
  type KindDefinition as LibKindDefinition,
  type KindShape,
} from "@galaxy-foundry/kind-schema";
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
  /**
   * Files a multi-file note bundles, as paths relative to the note's own directory. Casting
   * copies them verbatim. Only meaningful for a directory-shaped kind: a flat note's "directory"
   * is the whole collection, and every note in it would be naming files it does not own.
   */
  companions: z.ZodType<string[]>;
  /** One entry of a Mold's typed reference manifest. */
  reference: z.ZodType<unknown>;

  /** THE BASE ENVELOPE — the fields every kind in this instance carries. Kinds spread it. */
  base: {
    tags: z.ZodType<string[]>;
    status: z.ZodEnum<{
      draft: "draft";
      reviewed: "reviewed";
      revised: "revised";
      stale: "stale";
      archived: "archived";
    }>;
    created: z.ZodType<Date, unknown>;
    revised: z.ZodType<Date, unknown>;
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

  // A path RELATIVE TO THE NOTE'S DIRECTORY, so a note can name a file in a vendored subtree
  // and not only a flat sibling. `cwl-v1.2-schemas` is why: its seven upstream schemas live in
  // `cwl-v1.2/`, and while this pattern admitted no separator they were undeclarable — which is
  // the reason galaxyproject/foundry#404 fixed two notes and had to leave that one alone.
  //
  // Every segment is a literal name. No globs: the repo has exactly one glob dialect, in
  // `@galaxy-foundry/kind-schema/collections`, and it does not export its matcher — so a pattern
  // here would be a SECOND dialect, which is the drift that module's own header exists to end.
  // Naming seven files is also the more explicit half of the choice, and explicit is the point
  // of this field.
  const companionPath = z
    .string()
    .regex(/^[A-Za-z0-9._-]+(\/[A-Za-z0-9._-]+)*$/, {
      message: "must be a path relative to the note's directory",
    })
    // `[A-Za-z0-9._-]+` admits `.` and `..` as whole segments, so the character class alone
    // would let a note reach out of its own directory and bundle a file it does not own.
    .refine((p) => !p.split("/").some((seg) => seg === "." || seg === ".."), {
      message: "must not contain '.' or '..' segments",
    });

  const companions = z
    .array(companionPath)
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

// ---- the kind contract, bound to this instance's context ----
//
// `KindDefinition` and `defineKind` are not ours. They ship in @galaxy-foundry/kind-schema,
// generic over the context a kind draws from, because every Foundry-pattern instance needs the
// same contract over a different context. What is OURS is `KindContext` above — the field
// primitives a kind may spread. Binding the parameter once, here, is what keeps the nine kind
// directories writing `defineKind({...})` with no type parameter in sight.

export type { KindShape };

/**
 * What a `types/<kind>/schema.ts` exports.
 *
 * The contract itself — why `build` returns a bare strict object, why refinement is a separate
 * slot, how the union dispatches it — is documented on `KindDefinition` in
 * @galaxy-foundry/kind-schema, where that machinery now lives. It is deliberately not restated
 * here: two docstrings for one type is how the wrong one goes stale unnoticed.
 *
 * What is worth saying locally is what it means for a kind AUTHOR in this repo.
 *
 * `refine`'s `data` is this kind's INFERRED frontmatter, not `Record<string, unknown>`, and
 * that matters more than it reads: every rule is conditional, so a rule that never fires looks
 * exactly like a rule with nothing to complain about. Untyped, `d.axis === "source-specifc"`
 * compiled clean and the mold rule was silently dead. tests/kind-refine.test-d.ts pins it.
 */
export type KindDefinition<T extends KindShape = KindShape> = LibKindDefinition<KindContext, T>;

/**
 * A kind definition with its shape erased — for code that ITERATES the kinds rather than
 * validating with one. `ZodObject` is invariant in its shape parameter, so the widened
 * `KindDefinition` above cannot hold a concrete kind at all; this is the iteration type.
 */
export type AnyKindDefinition = LibAnyKindDefinition<KindContext>;

/**
 * Identity helper a kind directory wraps its definition in.
 *
 * It exists purely to INFER the object shape rather than widen it, and the two ways of losing
 * that inference fail very differently — worth knowing which one you are looking at.
 *
 * Annotating a kind `: KindDefinition` does not erase anything: it fails the package build
 * outright, one TS2322 at the annotation, because `ZodObject` is invariant in its shape
 * parameter and a concrete kind is not assignable to the default shape at all. Loud, local,
 * measured.
 *
 * The `any`-shaped erasure is the dangerous one, and it is not visible from here — see
 * `KINDS` in ./index.ts, where widening the LIST costs nothing anywhere except one type-level
 * test. Neither failure reaches the Astro site, which this comment used to claim was the guard.
 */
export const defineKind = kindDefiner<KindContext>();
