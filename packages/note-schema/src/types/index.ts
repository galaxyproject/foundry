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
import { kind as mold } from "./mold/schema.js";
import { kind as pattern } from "./pattern/schema.js";
import { kind as pipeline } from "./pipeline/schema.js";
import { kind as prompt } from "./prompt/schema.js";
import { kind as research } from "./research/schema.js";
import { kind as schemaNote } from "./schema/schema.js";
import { kind as sourcePattern } from "./source-pattern/schema.js";

import { type KindDefinition } from "./context.js";

// NOT annotated `: readonly KindDefinition[]`. That annotation would widen every element to
// the default shape and the erasure would propagate to the Astro site, where `entry.data.tags`
// degrades to `any`. Left inferred, this is a tuple of precisely-typed kinds.
export const KINDS = [
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

type BuiltKind<K> = K extends { build: (...args: never[]) => infer R } ? R : never;

/** Each kind's union member, in barrel order, with its shape preserved. */
export type BuiltKinds = { -readonly [I in keyof typeof KINDS]: BuiltKind<(typeof KINDS)[I]> };

/** Kind definitions by their `type:` discriminator value. */
export const KINDS_BY_NAME: ReadonlyMap<string, KindDefinition> = new Map(
  KINDS.map((k) => [k.kind, k as KindDefinition]),
);

export {
  buildKindContext,
  defineKind,
  type KindContext,
  type KindDefinition,
  type KindShape,
} from "./context.js";
