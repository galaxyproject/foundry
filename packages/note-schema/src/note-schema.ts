// The single source of truth for Foundry note frontmatter. This zod schema replaces the
// former hand-written meta_schema.yml (ajv) + site zod pair; the validator
// (`@galaxy-foundry/build-cli`) and the Astro site both build it from the same three
// registries so the two encodings can no longer drift.
//
// This module is now only the ASSEMBLER. Each note kind is defined — and documented, and
// exemplified — in its own directory under src/types/; see src/types/index.ts for the
// enumeration and src/types/context.ts for the shared envelope every kind spreads.
//
// `buildNoteSchema` is a factory: the controlled enums (tags, reference-contract vocab,
// license ids) live in YAML registries loaded at call time and injected here, mirroring how
// the old validator injected them into the JSON Schema.

import { z } from "zod";

import { buildKindContext, type BuildKindContextOptions } from "./types/context.js";
import { KINDS, KINDS_BY_NAME, type BuiltKinds } from "./types/index.js";

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
