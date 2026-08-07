// Where this Foundry's cast bundles sit under `casts/<target>/`.
//
// Resolving a `bundle_path` declaration belongs to @galaxy-foundry/cast, which takes a target
// DIRECTORY and knows nothing about where a Foundry keeps its targets. What stays here is the
// one fact that is ours — that they live under `casts/` — stated once, so the caster, the
// verifier, the pipeline assembler and the site cannot hold four copies of it and disagree.

import {
  bundleDir as bundleDirOf,
  bundlePathTemplate as templateOf,
  castsTargetDir,
} from "@galaxy-foundry/cast";

export { bundlePathOf, DEFAULT_BUNDLE_PATH, resolveBundlePath } from "@galaxy-foundry/cast";

/**
 * The directory holding one target's declaration and its bundles: `casts/<target>/`.
 *
 * Re-exported so the `casts/` fact stays stated once. Reached past — by importing it from the
 * package directly, or by joining the two segments by hand — it becomes the copies this module
 * exists to prevent.
 */
export { castsTargetDir } from "@galaxy-foundry/cast";

/** The `bundle_path` a target declares, or the default when it declares none. */
export function bundlePathTemplate(repoRoot: string, target: string): string {
  return templateOf(castsTargetDir(repoRoot, target));
}

/** Absolute directory of one bundle, reading the target's declaration from disk. */
export function bundleDir(repoRoot: string, target: string, name: string): string {
  return bundleDirOf(castsTargetDir(repoRoot, target), name);
}
