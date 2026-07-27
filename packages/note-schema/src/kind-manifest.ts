// This Foundry's kind manifest — the machine-readable form of "what kinds does this
// Foundry define, and what metadata does each require".
//
// The FORMAT, the zod-shape deriver, and the reader all live in
// @galaxy-foundry/kind-manifest, because they are shared across instances (spec:
// galaxyproject/foundry-pattern, `content/pattern/standing-up-a-foundry.instructions.txt`).
// What stays here is the part that is genuinely ours: which kinds exist, and how this
// instance's registries resolve into the context they are built against.
//
// `fields` is still DERIVED from the zod shape, never hand-written — that has just moved
// one repo over, along with the synthetic-shape tests that prove the deriver right.

import {
  buildKindManifest as deriveKindManifest,
  type KindManifest,
  type ManifestSource,
} from "@galaxy-foundry/kind-manifest";

import { buildKindContext } from "./types/context.js";
import type { BuildKindContextOptions } from "./types/context.js";
import { KINDS } from "./types/index.js";

export {
  describeFields,
  describeType,
  KIND_MANIFEST_VERSION,
  parseKindManifest,
  withRevision,
  type KindManifest,
  type ManifestField,
  type ManifestKind,
  type ManifestSource,
} from "@galaxy-foundry/kind-manifest";

/**
 * Where this Foundry's manifest lives, so a consumer vendoring a copy does not have to
 * hard-code our identity on our behalf.
 *
 * Deliberately no `revision`: the manifest is a committed artifact whose CI gate
 * regenerates it and string-compares, so anything in it that varies with the current
 * commit makes `--check` fail on every commit. Whoever takes a snapshot records that.
 */
export const MANIFEST_SOURCE: ManifestSource = {
  repo: "galaxyproject/foundry",
  path: "packages/note-schema/src/types/kinds.generated.json",
};

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
  return deriveKindManifest({
    instance,
    source: MANIFEST_SOURCE,
    kinds: KINDS.map((definition) => {
      const doc = docs[definition.kind];
      return {
        kind: definition.kind,
        title: definition.title,
        layer: definition.layer,
        summary: definition.summary,
        shape: definition.build(ctx).shape,
        ...(doc === undefined ? {} : { doc }),
      };
    }),
  });
}
