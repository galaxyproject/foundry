// Derive the kind manifest — the machine-readable form of "what kinds does this Foundry
// define, and what metadata does each require".
//
// `fields` is DERIVED from the zod shape, never hand-written. A hand-maintained
// required-metadata table is a second encoding of the schema and drifts the first week; this
// one cannot, because it is read off the same object the validator runs.
//
// The FORMAT is shared across Foundry instances (spec: galaxyproject/foundry-pattern,
// `content/pattern/standing-up-a-foundry.instructions.txt`), so treat a format change as a
// cross-repo change. The kinds in it are this instance's own.

import type { z } from "zod";

import { buildKindContext } from "./types/context.js";
import type { BuildKindContextOptions } from "./types/context.js";
import { KINDS } from "./types/index.js";

export const KIND_MANIFEST_VERSION = 1;

export interface ManifestField {
  name: string;
  required: boolean;
  /** A readable rendering of the zod type, for the catalog's metadata table. */
  type: string;
}

export interface ManifestKind {
  kind: string;
  title: string;
  /** Which layer the kind belongs to. Deliberately not `origin` — see `KindDefinition`. */
  layer: "substrate" | "instance";
  summary: string;
  /** The body of the kind's kind.md, verbatim. Supplied by the caller, which knows the paths. */
  doc?: string;
  fields: ManifestField[];
}

export interface KindManifest {
  instance: string;
  version: number;
  kinds: ManifestKind[];
}

/**
 * Render a zod type as a short readable string.
 *
 * Deliberately shallow: this feeds a human-facing metadata table, not a code generator, so
 * `string[]` beats a faithful but unreadable expansion of every refinement.
 */
export function describeType(schema: z.ZodTypeAny): string {
  const def = schema._def as { typeName?: string; [k: string]: unknown };
  switch (def.typeName) {
    case "ZodOptional":
    case "ZodNullable":
    case "ZodDefault":
      return describeType((def.innerType ?? def.type) as z.ZodTypeAny);
    case "ZodEffects":
      return describeType(def.schema as z.ZodTypeAny);
    case "ZodLazy":
      return "any";
    case "ZodString":
      return "string";
    case "ZodNumber":
      return "number";
    case "ZodBoolean":
      return "boolean";
    case "ZodDate":
      return "date";
    case "ZodLiteral":
      return JSON.stringify((def as { value: unknown }).value);
    case "ZodEnum":
      return ((def as { values: string[] }).values ?? []).join(" | ");
    case "ZodArray":
      return `${describeType(def.type as z.ZodTypeAny)}[]`;
    case "ZodUnion":
    case "ZodDiscriminatedUnion": {
      const opts = (def.options ?? []) as z.ZodTypeAny[];
      const rendered = [...new Set(opts.map(describeType))];
      return rendered.length > 3 ? "one of several shapes" : rendered.join(" | ");
    }
    case "ZodObject":
      return "object";
    default:
      return "any";
  }
}

/**
 * Walk a kind's object shape into the manifest's field list, sorted required-first.
 *
 * `required` answers "must an author write this key", so a field carrying `.default()` counts
 * as optional — zod reports it optional and the note validates without it.
 */
export function describeFields(shape: z.ZodRawShape): ManifestField[] {
  return Object.entries(shape)
    .map(([name, field]) => ({
      name,
      required: !field.isOptional(),
      type: describeType(field),
    }))
    .sort((a, b) => Number(b.required) - Number(a.required) || a.name.localeCompare(b.name));
}

export interface BuildKindManifestOptions extends BuildKindContextOptions {
  /** Slug identifying this Foundry in a cross-instance catalog. */
  instance: string;
  /** kind name -> kind.md body. The caller reads these; this module stays filesystem-free. */
  docs?: Record<string, string>;
}

export function buildKindManifest({
  instance,
  docs = {},
  ...registries
}: BuildKindManifestOptions): KindManifest {
  const ctx = buildKindContext(registries);
  return {
    instance,
    version: KIND_MANIFEST_VERSION,
    kinds: KINDS.map((definition) => ({
      kind: definition.kind,
      title: definition.title,
      layer: definition.layer,
      summary: definition.summary,
      doc: docs[definition.kind],
      fields: describeFields(definition.build(ctx).shape),
    })),
  };
}
