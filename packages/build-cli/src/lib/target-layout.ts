// Where a target's cast bundles sit under `casts/<target>/`.
//
// This is placement, so it belongs to the target — the same split the per-kind `dst_dir` /
// `dst_extension` rows already follow. It was previously a `target === "claude"` ternary
// repeated in the caster, the verifier, the pipeline assembler and the site: four copies of one
// fact, in a repo that has now twice found a hand-written list disagreeing with the declaration
// it duplicated.

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import yaml from "js-yaml";

/** Substituted with the bundle's name (a Mold slug, or a pipeline harness name). */
export const BUNDLE_NAME_TOKEN = "{mold}";

/**
 * The layout of a target that declares none: one directory per bundle, named for it.
 *
 * The Claude target is not this — it declares `skills/{mold}` so that `casts/claude/` doubles as
 * a Claude Code plugin root (`.claude-plugin/plugin.json` beside `skills/<name>/SKILL.md`).
 */
export const DEFAULT_BUNDLE_PATH = BUNDLE_NAME_TOKEN;

/**
 * Resolve a declared `bundle_path` template against one bundle name.
 *
 * Rejects a template that cannot place a bundle (no name token) or that would place it outside
 * the target directory — a `_target.yml` is repo data, but a path template that escapes its own
 * target is a mistake worth failing on rather than a layout worth honouring.
 */
export function resolveBundlePath(template: string, name: string): string {
  if (!template.includes(BUNDLE_NAME_TOKEN)) {
    throw new Error(`bundle_path must contain ${BUNDLE_NAME_TOKEN}: got ${template}`);
  }
  const rel = template.split(BUNDLE_NAME_TOKEN).join(name);
  if (path.isAbsolute(rel) || rel.split(/[/\\]/).includes("..")) {
    throw new Error(`bundle_path must stay inside the target directory: got ${template}`);
  }
  return rel;
}

/**
 * Validate a declared `bundle_path`, defaulting when a target declares none.
 *
 * The type check earns its message: `bundle_path: {mold}` is not the string it looks like —
 * unquoted braces are YAML *flow-mapping* syntax, so it loads as `{ mold: null }` and every
 * downstream string operation fails somewhere far away. Say so here instead.
 */
export function bundlePathOf(declared: unknown, source: string): string {
  if (declared === undefined || declared === null) return DEFAULT_BUNDLE_PATH;
  if (typeof declared !== "string") {
    throw new Error(
      `${source}: bundle_path must be a string — an unquoted ${BUNDLE_NAME_TOKEN} is a YAML mapping, so quote it`,
    );
  }
  return declared;
}

/** The `bundle_path` a target declares, or the default when it declares none. */
export function bundlePathTemplate(repoRoot: string, target: string): string {
  const p = path.join(repoRoot, "casts", target, "_target.yml");
  if (!existsSync(p)) return DEFAULT_BUNDLE_PATH;
  const data = yaml.load(readFileSync(p, "utf8")) as { bundle_path?: unknown } | null;
  return bundlePathOf(data && typeof data === "object" ? data.bundle_path : undefined, p);
}

/** Absolute directory of one bundle, reading the target's declaration from disk. */
export function bundleDir(repoRoot: string, target: string, name: string): string {
  return path.join(
    repoRoot,
    "casts",
    target,
    resolveBundlePath(bundlePathTemplate(repoRoot, target), name),
  );
}
