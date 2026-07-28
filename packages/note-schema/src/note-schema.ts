// The single source of truth for Foundry note frontmatter. One zod encoding, built by both
// the validator (`@galaxy-foundry/build-cli`) and the Astro site from the same three
// registries, so there is no second encoding to drift against.
//
// This module is the ASSEMBLER, and only the assembler. Each note kind is defined — and
// documented, and exemplified — in its own directory under src/types/; see src/types/index.ts
// for the enumeration and src/types/context.ts for the shared envelope every kind spreads.
//
// `buildNoteSchema` is a factory rather than a constant because the controlled enums (tags,
// reference-contract vocab, license ids) live in YAML registries loaded at call time and
// injected here — which is also what lets a test build the schema against a synthetic registry.

import { z } from "zod";

import {
  buildKindContext,
  type BuildKindContextOptions,
  type KindContext,
  type KindDefinition,
  type KindShape,
} from "./types/context.js";
import { DEFINITIONS, KINDS, KINDS_BY_NAME, type BuiltKinds } from "./types/index.js";

export type BuildNoteSchemaOptions = BuildKindContextOptions;

export function buildNoteSchema(options: BuildNoteSchemaOptions) {
  const ctx = buildKindContext(options);

  // zod's discriminatedUnion accepts ZodObject members only, so each kind contributes a plain
  // strict object here and its cross-field rules run in the dispatch below. The rules still
  // LIVE in the kind's directory — this only decides when they fire.
  //
  // The assertion is the one place a cast is unavoidable: `.map` over a tuple returns an
  // array, losing the per-element types the site's frontmatter inference depends on. The
  // mapped type restores exactly what `.map` erased — same order, same length, same elements.
  type Member = BuiltKinds[number];
  const members = KINDS.map((k) => k.build(ctx)) as unknown as readonly [Member, ...Member[]];

  return z.discriminatedUnion("type", members).superRefine((d, issues) => {
    const definition = KINDS_BY_NAME.get((d as { type: string }).type);
    definition?.refine?.(d as Record<string, unknown>, issues, ctx);
  });
}

export type NoteSchema = ReturnType<typeof buildNoteSchema>;

/**
 * One kind's assembled schema: parses that kind's frontmatter, yields that kind's own output.
 *
 * Stated as ONE type rather than left to inference, because inference over the optional
 * `refine` slot yields a UNION of "refined" and "not" — and a union is what turns an ordinary
 * field access on an Astro page into an error, since it would have to hold on both arms.
 */
export type Assembled<T extends KindShape> = z.ZodType<
  z.infer<z.ZodObject<T, "strict">>,
  z.ZodTypeDef,
  z.input<z.ZodObject<T, "strict">>
>;

/**
 * Assemble one kind into the schema its collection validates with.
 *
 * `build` returns the bare strict object so the manifest generator can walk its `.shape`;
 * `refine` is applied here, to that kind's schema alone, so a cross-field rule sees only its
 * own kind's fields.
 */
function assemble<T extends KindShape>(
  definition: KindDefinition<T>,
  ctx: KindContext,
): Assembled<T> {
  const object = definition.build(ctx);
  const { refine } = definition;
  const refined = refine
    ? object.superRefine((d, issues) => refine(d as Record<string, unknown>, issues, ctx))
    : object;
  return refined as Assembled<T>;
}

/**
 * Every kind's schema, by kind name — what a per-collection Astro loader validates with.
 *
 * Assembled ONE BY ONE rather than by mapping over KINDS or DEFINITIONS. A `.map` produces a
 * homogeneous array and every kind's shape collapses to the widest common type, which is how
 * the pages end up with `entry.data: unknown`. Named properties keep each kind precise, at the
 * cost of one line per kind — the same trade `DEFINITIONS` itself makes, for the same reason.
 */
export function buildKindSchemas(options: BuildNoteSchemaOptions) {
  const ctx = buildKindContext(options);
  return {
    mold: assemble(DEFINITIONS.mold, ctx),
    pattern: assemble(DEFINITIONS.pattern, ctx),
    "source-pattern": assemble(DEFINITIONS["source-pattern"], ctx),
    "cli-tool": assemble(DEFINITIONS["cli-tool"], ctx),
    "cli-command": assemble(DEFINITIONS["cli-command"], ctx),
    pipeline: assemble(DEFINITIONS.pipeline, ctx),
    research: assemble(DEFINITIONS.research, ctx),
    schema: assemble(DEFINITIONS.schema, ctx),
    prompt: assemble(DEFINITIONS.prompt, ctx),
  };
}

export type KindSchemas = ReturnType<typeof buildKindSchemas>;
