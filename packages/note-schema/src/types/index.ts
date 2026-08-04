// The barrel — the ONE enumeration of the note kinds this Foundry defines.
//
// Adding a kind is: add a directory beside this file, add one line here. Nothing else.
//
// STATIC imports, deliberately. A runtime glob would have to work identically under
// tsc-to-dist, under vitest, and inside Astro's bundler, and nothing does all three; a
// missed directory is caught by test/kind-directories.test.ts instead, which asserts this
// list and the directory listing agree in BOTH directions.

import { kind as cliCommand } from "./cli-command/schema.js";
import { kind as cliTool } from "./cli-tool/schema.js";
import { kind as meta } from "./meta/schema.js";
import { kind as mold } from "./mold/schema.js";
import { kind as pattern } from "./pattern/schema.js";
import { kind as pipeline } from "./pipeline/schema.js";
import { kind as prompt } from "./prompt/schema.js";

import { kind as research } from "./research/schema.js";
import { kind as schemaNote } from "./schema/schema.js";
import { kind as sourcePattern } from "./source-pattern/schema.js";

import { type AnyKindDefinition } from "./context.js";

// `as const`, and NOT annotated. The tuple is load-bearing: `buildKindUnion` is generic over the
// kind LIST and recovers each member's output type from it. Annotate this
// `readonly AnyKindDefinition[]` and `.map` erasure reaches the return type, so
// `z.infer<NoteSchema>` — which this package re-exports — degrades to `unknown` for consumers
// who never touched a kind.
//
// Nothing you would think to run reports that. Measured: the widening costs 0 `tsc` errors
// across the packages and 0 in `astro check`, because the erasure arrives as `any`, and an `any`
// satisfies every field access rather than failing one. tests/note-union.test-d.ts is the only
// thing that catches it, which is why it exists.
export const KINDS = [
  meta,
  mold,
  pattern,
  sourcePattern,
  cliTool,
  cliCommand,
  pipeline,
  research,
  schemaNote,
  prompt,
] as const;

/**
 * The same kinds, reachable BY NAME with their shapes intact.
 *
 * `KINDS_BY_NAME` cannot serve this purpose. A Map has one value type for every entry, so a
 * lookup through it yields the widened `KindDefinition` and every field the caller knew about
 * is gone. Named properties keep each kind precisely typed, which is what lets a per-collection
 * schema carry its own frontmatter type all the way to the Astro pages.
 *
 * Keys are the `type:` discriminator values, so `DEFINITIONS[COLLECTIONS[c].kind]` resolves to
 * exactly one kind rather than to a union of ten.
 */
export const DEFINITIONS = {
  meta,
  mold,
  pattern,
  "source-pattern": sourcePattern,
  "cli-tool": cliTool,
  "cli-command": cliCommand,
  pipeline,
  research,
  schema: schemaNote,
  prompt,
} as const;

/**
 * Kind definitions by their `type:` discriminator value.
 *
 * Erased to `AnyKindDefinition`, and it has to be: a Map has one value type for every entry, so
 * the shapes collapse regardless. Callers who need a kind with its shape intact go through
 * `DEFINITIONS` above.
 */
export const KINDS_BY_NAME: ReadonlyMap<string, AnyKindDefinition> = new Map(
  KINDS.map((k) => [k.kind, k]),
);

export {
  buildKindContext,
  defineKind,
  type AnyKindDefinition,
  type KindContext,
  type KindDefinition,
  type KindReference,
  type KindShape,
} from "./context.js";
