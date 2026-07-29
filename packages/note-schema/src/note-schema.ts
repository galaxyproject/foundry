// The single source of truth for Foundry note frontmatter. One zod encoding, built by both
// the validator (`@galaxy-foundry/build-cli`) and the Astro site from the same three
// registries, so there is no second encoding to drift against.
//
// This module is the ASSEMBLER, and only the assembler — and the assembly itself is no longer
// ours. `assemble` and `buildKindUnion` ship in @galaxy-foundry/kind-schema, parameterized by
// the kind context. What stays here is which kinds this Foundry has and how its registries
// resolve into that context. Each note kind is defined — and documented, and exemplified — in
// its own directory under src/types/; see src/types/index.ts for the enumeration and
// src/types/context.ts for the shared envelope every kind spreads.
//
// `buildNoteSchema` is a factory rather than a constant because the controlled enums (tags,
// reference-contract vocab, license ids) live in YAML registries loaded at call time and
// injected here — which is also what lets a test build the schema against a synthetic registry.

import { assemble, buildKindUnion } from "@galaxy-foundry/kind-schema";

import { buildKindContext, type BuildKindContextOptions } from "./types/context.js";
import { DEFINITIONS, KINDS } from "./types/index.js";

export type { Assembled } from "@galaxy-foundry/kind-schema";

export type BuildNoteSchemaOptions = BuildKindContextOptions;

export function buildNoteSchema(options: BuildNoteSchemaOptions) {
  return buildKindUnion(KINDS, buildKindContext(options));
}

export type NoteSchema = ReturnType<typeof buildNoteSchema>;

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
