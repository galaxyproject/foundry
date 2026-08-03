// Discover cast artifacts on disk for a given Mold slug.
//
// Layout:
//   casts/<target>/<bundle_path>/SKILL.md
//
// Which targets exist is read off the tree, and where each puts its bundles is read off that
// target's `_target.yml` — see discoverTargets and target-layout.ts. Neither is listed here;
// this file used to hardcode both, and outlived two targets that were deleted.
//
// Used by the Astro Mold page (Cast Artifacts panel) and the /usage/ index.

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  bundlePathTemplate,
  resolveBundlePath,
} from "../../../packages/build-cli/src/lib/target-layout.js";

/** A cast target's name — whatever directory under `casts/` carries a `_target.yml`. */
export type CastTarget = string;

export interface CastArtifact {
  target: CastTarget;
  moldSlug: string;
  /** Repo-absolute directory of the cast. */
  dir: string;
  /** True if the cast has a SKILL.md (Claude convention). */
  hasSkill: boolean;
  /** Parsed name from SKILL.md frontmatter. */
  name?: string;
  /** Parsed description from SKILL.md frontmatter. */
  description?: string;
}

export interface CastRef {
  kind: string;
  mode: string;
  ref: string;
  src: string;
  dst: string;
  used_at: string;
  load: string;
  evidence?: string;
  purpose?: string;
  trigger?: string;
  verification?: string;
  source?: string;
  src_hash?: string;
  dst_hash?: string;
}

export interface CastProvenance {
  provenance_schema_version: number;
  cast_target: CastTarget;
  mold?: {
    name?: string;
    path?: string;
    revision?: number;
    content_hash?: string;
    commit?: string;
  };
  cast_at?: string;
  cast_date?: string;
  cast_revision?: number;
  refs?: CastRef[];
  artifacts?: {
    produces?: unknown[];
    consumes?: unknown[];
  };
  validation_results?: unknown[];
  open_questions?: string[];
}

export interface CastAttachedFile extends CastRef {
  /** Path relative to the cast bundle root. */
  bundlePath: string;
  /** Repo-absolute path to the packaged file, if it exists and is inside the bundle. */
  absPath: string | null;
  exists: boolean;
  sizeBytes: number | null;
  extension: string;
  anchor: string;
}

export interface ClaudeSkillBundle extends CastArtifact {
  skillPath: string;
  provenance: CastProvenance | null;
  attachedFiles: CastAttachedFile[];
}

/**
 * The cast targets that exist, which is the ones carrying a `_target.yml`.
 *
 * Listed rather than declared: a hardcoded `['claude', 'web', 'generic']` outlived the
 * `web` and `generic` scaffolds by naming two directories that were deleted, and a target
 * list that can disagree with the targets is the thing this repo keeps removing. A target
 * is real when it has a config the caster can read; nothing else has to be told.
 */
function discoverTargets(repoRoot: string): CastTarget[] {
  const castsRoot = path.join(repoRoot, "casts");
  if (!existsSync(castsRoot)) return [];
  return readdirSync(castsRoot)
    .filter((name) => !name.startsWith("."))
    .filter((name) => existsSync(path.join(castsRoot, name, "_target.yml")))
    .sort();
}

/**
 * Pipeline harness casts (`pipeline-<slug>`, carrying `_assembly.json` not
 * `_provenance.json`) are not Mold casts. They render on the pipelines surface,
 * not in the `/usage/` cast inventory.
 */
export function isHarnessSlug(slug: string): boolean {
  return slug.startsWith("pipeline-");
}

/** Repo root inferred relative to this file: site/src/lib → ../../.. */
function defaultRepoRoot(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, "..", "..", "..");
}

function castDirFor(target: CastTarget, moldSlug: string, repoRoot: string): string {
  const rel = resolveBundlePath(bundlePathTemplate(repoRoot, target), moldSlug);
  return path.join(repoRoot, "casts", target, rel);
}

/**
 * The directory bundles sit *in* for a target — the parent of one resolved bundle path.
 *
 * Derived from the same declaration rather than named separately, so a target that moves its
 * bundles cannot move them for the per-Mold lookup and not for the inventory walk.
 */
function castsRootFor(target: CastTarget, repoRoot: string): string {
  return path.dirname(castDirFor(target, "_", repoRoot));
}

function readSkillFrontmatter(skillPath: string): { name?: string; description?: string } {
  if (!existsSync(skillPath)) return {};
  const text = readFileSync(skillPath, "utf8");
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return {};
  const out: { name?: string; description?: string } = {};
  for (const line of m[1]!.split("\n")) {
    const k = line.match(/^(name|description):\s*(.*?)\s*$/);
    if (!k) continue;
    let v = k[2]!;
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    out[k[1] as "name" | "description"] = v;
  }
  return out;
}

function readProvenance(provenancePath: string): CastProvenance | null {
  if (!existsSync(provenancePath)) return null;
  try {
    return JSON.parse(readFileSync(provenancePath, "utf8")) as CastProvenance;
  } catch {
    return null;
  }
}

function anchorForPath(bundlePath: string): string {
  return `ref-${bundlePath
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}`;
}

function safeBundlePath(bundleRoot: string, bundlePath: string): string | null {
  const abs = path.resolve(bundleRoot, bundlePath);
  const rel = path.relative(bundleRoot, abs);
  if (rel.startsWith("..") || path.isAbsolute(rel)) return null;
  return abs;
}

function attachedFilesFor(dir: string, provenance: CastProvenance | null): CastAttachedFile[] {
  if (!provenance?.refs) return [];
  return provenance.refs.map((ref) => {
    const absPath = safeBundlePath(dir, ref.dst);
    const exists = absPath ? existsSync(absPath) : false;
    const stats = exists && absPath ? statSync(absPath) : null;
    return {
      ...ref,
      bundlePath: ref.dst,
      absPath: exists ? absPath : null,
      exists,
      sizeBytes: stats?.size ?? null,
      extension: path.extname(ref.dst).replace(/^\./, ""),
      anchor: anchorForPath(ref.dst),
    };
  });
}

export function loadClaudeSkillBundle(
  moldSlug: string,
  repoRoot: string = defaultRepoRoot(),
): ClaudeSkillBundle | null {
  const dir = castDirFor("claude", moldSlug, repoRoot);
  const skillPath = path.join(dir, "SKILL.md");
  if (!existsSync(dir) || !existsSync(skillPath)) return null;
  const provenance = readProvenance(path.join(dir, "_provenance.json"));
  const fm = readSkillFrontmatter(skillPath);
  return {
    target: "claude",
    moldSlug,
    dir,
    hasSkill: true,
    ...fm,
    skillPath,
    provenance,
    attachedFiles: attachedFilesFor(dir, provenance),
  };
}

/** All cast artifacts for one mold, across targets. */
export function listCastsForMold(
  moldSlug: string,
  repoRoot: string = defaultRepoRoot(),
): CastArtifact[] {
  const out: CastArtifact[] = [];
  for (const target of discoverTargets(repoRoot)) {
    const dir = castDirFor(target, moldSlug, repoRoot);
    if (!existsSync(dir)) continue;
    const skillPath = path.join(dir, "SKILL.md");
    const hasSkill = existsSync(skillPath);
    const fm = hasSkill ? readSkillFrontmatter(skillPath) : {};
    out.push({ target, moldSlug, dir, hasSkill, ...fm });
  }
  return out;
}

/** All cast artifacts across all molds, by walking the casts tree. */
export function listAllCasts(repoRoot: string = defaultRepoRoot()): CastArtifact[] {
  const out: CastArtifact[] = [];
  for (const target of discoverTargets(repoRoot)) {
    const root = castsRootFor(target, repoRoot);
    if (!existsSync(root)) continue;
    let entries: string[];
    try {
      entries = readdirSync(root);
    } catch {
      continue;
    }
    for (const name of entries) {
      if (name.startsWith(".") || name.startsWith("_")) continue;
      const dir = path.join(root, name);
      if (!statSync(dir).isDirectory()) continue;
      // Pipeline harnesses (prefix + an `_assembly.json` manifest) render on the
      // pipelines surface, not the `/usage/` cast inventory.
      if (isHarnessSlug(name) && existsSync(path.join(dir, "_assembly.json"))) continue;
      const skillPath = path.join(dir, "SKILL.md");
      const hasSkill = existsSync(skillPath);
      const fm = hasSkill ? readSkillFrontmatter(skillPath) : {};
      out.push({ target, moldSlug: name, dir, hasSkill, ...fm });
    }
  }
  return out.sort(
    (a, b) => a.target.localeCompare(b.target) || a.moldSlug.localeCompare(b.moldSlug),
  );
}

// ── Pipeline harness assemblies (`_assembly.json`) ──────────────────────────
// Produced by `/assemble-pipeline`; the stop-gap harness manifest. One per
// `pipeline-<slug>` cast. Shape mirrors scripts/assemble-pipeline output.

export interface AssemblyPhase {
  phase: number;
  kind: "mold" | "branch" | string;
  /** Present for `kind: mold`. */
  skill?: string;
  /** Boolean for mold phases; per-leg array for branch phases. */
  cast_present: boolean | (boolean | null)[];
  loop?: boolean;
  /** Branch phases. */
  pattern?: string;
  chain?: string[];
  branches?: unknown[];
}

export interface AssemblyManifest {
  source_pipeline: string;
  source_revision: number;
  harness_name: string;
  /** Runtime invocation flags the harness honors (e.g. `use-subagents`, `checkpoint`). */
  options?: string[];
  phases: AssemblyPhase[];
}

export interface AssemblyStats {
  total: number;
  /** Phases that resolve to a present cast and auto-run (`cast_present === true`). */
  cast: number;
  /** Everything else — uncast Molds and branch routing — handled by hand today. */
  manual: number;
  loops: number;
}

/** Load the harness assembly for a pipeline slug (e.g. `nextflow-to-galaxy`). */
export function loadAssembly(
  pipelineSlug: string,
  repoRoot: string = defaultRepoRoot(),
): AssemblyManifest | null {
  const file = path.join(
    castDirFor("claude", `pipeline-${pipelineSlug}`, repoRoot),
    "_assembly.json",
  );
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, "utf8")) as AssemblyManifest;
  } catch {
    return null;
  }
}

export function assemblyStats(manifest: AssemblyManifest): AssemblyStats {
  let cast = 0;
  let manual = 0;
  let loops = 0;
  for (const p of manifest.phases) {
    if (p.cast_present === true) cast += 1;
    else manual += 1;
    if (p.loop) loops += 1;
  }
  return { total: manifest.phases.length, cast, manual, loops };
}
