// The assembled union keeps its members' shapes, asserted where that fact lives: the typecheck.
//
// This is the guard the comments around `KINDS` used to claim the Astro site was. It is not:
// widening `KINDS` to `readonly AnyKindDefinition[]` was measured at 0 `tsc` errors in the
// packages AND 0 in `astro check`, because the erasure lands as `any` and an `any` satisfies
// every field access rather than failing one. The site cannot report a type it is handed.
//
// What it costs, unguarded, is not local. `NoteSchema` is re-exported from this package's public
// API, so an erased union hands `z.infer<NoteSchema>` of `unknown` to consumers who never
// touched the kinds — which is exactly the regression that shipped once and was caught by a
// hand-run probe rather than by CI.
//
// Checked by `tsc --noEmit` at the repo root (`npm run typecheck`, which CI runs), because the
// root tsconfig includes tests/. vitest does not collect this file — its include is
// `tests/**/*.test.ts`, and `.test-d.ts` does not match.

import type { z } from "zod";

import type { NoteSchema } from "@galaxy-foundry/note-schema";

type Note = z.infer<NoteSchema>;

declare const note: Note;

/** The discriminator survives: narrowing by `type` is what every consumer does first. */
export const discriminator: Note["type"] = note.type;

/** An arm's own field survives, reachable only after narrowing to that arm. */
export const axis = note.type === "mold" ? note.axis : undefined;

// @ts-expect-error — a field NO kind declares must not compile. If this stops erroring, the
// union has erased to `unknown` with an index signature and every field access below it is
// silently meaningless, including the two above.
export const bogus = note.definitely_not_a_field;

// @ts-expect-error — `axis` belongs to the mold arm alone, so reading it off an unnarrowed note
// must fail. This is what separates "the union kept its arms" from "the union collapsed into
// one wide record that happens to contain every field".
export const unnarrowedAxis = note.axis;
