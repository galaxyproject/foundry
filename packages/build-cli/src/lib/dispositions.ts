// What the kind layer says about casting: which companion a cast packages, and which companions
// a cast must never contain.
//
// Nothing here decides anything. Each kind declares a `disposition` per companion in
// `packages/note-schema/src/types/*/schema.ts`; this module reads those declarations and answers
// the two questions casting asks of them. The answers used to be written down a second time —
// `_target.yml` carried `forbid_packaged_files` by hand, and it named two of the eight companions
// the kinds declare a cast must not carry. A hand-maintained restatement of a declaration is a
// thing that can disagree with the declaration, and that one did.

import { companionsOf, type NormalizedCompanion } from "@galaxy-foundry/kind-schema";
import { DEFINITIONS } from "@galaxy-foundry/note-schema";

/**
 * The one file a note of `kind` carries that casting packages.
 *
 * Derived from the kind rather than restated here, and asserted to be singular: two `bundled`
 * companions would make "the payload" ambiguous, and the failure belongs at lookup time rather
 * than in a cast that silently picked the first one.
 *
 * Answers the `payload-companion` resolve strategy for whichever kind declares it. This read
 * `DEFINITIONS.prompt` directly while `prompt` was the only kind using that strategy, which put
 * the strategy's one instance in the code rather than in the declaration that selects it.
 */
export function payloadCompanionOf(kind: string): string {
  const definition = DEFINITIONS[kind as keyof typeof DEFINITIONS];
  if (!definition) throw new Error(`${kind}: no such kind, so it declares no bundled companion`);
  const bundled = [...companionsOf(definition).values()].filter(
    (companion) => companion.disposition === "bundled",
  );
  if (bundled.length !== 1) {
    throw new Error(`${kind}: expected exactly one bundled companion, found ${bundled.length}`);
  }
  return bundled[0]!.name;
}

/** A companion no cast may carry, with the kinds that say so. */
export interface UnpackagedCompanion extends NormalizedCompanion {
  /** Every kind declaring this companion with a disposition other than `bundled`. */
  declaredBy: readonly string[];
}

/**
 * Companions that never travel into a cast: `foundry-only` (stays in the Foundry) and
 * `cast-input` (read while casting, not shipped).
 *
 * A union across every kind, because a bundle holds files from several kinds at once and a stray
 * arrives carrying no record of which kind it came from — the only thing a check has to go on is
 * the name. Which is also why a name ANY kind declares `bundled` is excluded even when another
 * kind calls it `foundry-only`: `examples/` is packaged by both `mold` and `pipeline` today, and
 * refusing a name one kind legitimately ships in order to catch one that doesn't would trade a
 * real file for a hypothetical one.
 */
export const NEVER_PACKAGED: readonly UnpackagedCompanion[] = ((): UnpackagedCompanion[] => {
  const packaged = new Set<string>();
  const unpackaged = new Map<string, UnpackagedCompanion>();

  for (const [kind, definition] of Object.entries(DEFINITIONS)) {
    // A file-shaped kind has no directory to hold a companion, so it declares none. Skipped
    // rather than trusted: a companion declared on a flat kind is a bug in that declaration,
    // and reading it here would spread the bug into every cast's verification.
    if (definition.shape !== "directory") continue;
    for (const companion of companionsOf(definition).values()) {
      if (companion.disposition === "bundled") {
        packaged.add(companion.name);
        continue;
      }
      const existing = unpackaged.get(companion.name);
      if (existing)
        unpackaged.set(companion.name, { ...existing, declaredBy: [...existing.declaredBy, kind] });
      else unpackaged.set(companion.name, { ...companion, declaredBy: [kind] });
    }
  }

  return [...unpackaged.values()]
    .filter((companion) => !packaged.has(companion.name))
    .sort((a, b) => a.name.localeCompare(b.name));
})();
