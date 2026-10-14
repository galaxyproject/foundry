// Canonical readers for the committed cast tree: assembled pipeline harnesses and the per-skill
// provenance records beside them.
//
// These shapes were privately redeclared in `commands/test-pipeline.ts` and again in the site's
// `lib/casts.ts`. A third consumer arrived (the run-dashboard reader) and three partial copies of
// one on-disk contract is how a field rename silently stops being read in two of them. The types
// and the loaders live here now; callers narrow, they do not re-describe.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import type { RuntimeArtifactRegistry } from "@galaxy-foundry/gxwf-foundry-note-schema";

import type { ProvenanceArtifacts } from "./artifact-contract.js";

export const CAST_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** The sentinel a branch chain may end on: not a skill, a hand-off back to the user. */
export const TERMINAL_SENTINELS = new Set(["user-supplied"]);

/** One entry of an assembled harness's `phases` array. */
export interface AssemblyPhase {
  phase: number;
  kind: string;
  skill?: string;
  loop?: boolean;
  cast_present?: boolean | Array<boolean | null>;
  pattern?: string;
  chain?: string[];
  branches?: unknown;
}

/** `casts/claude/skills/pipeline-<slug>/_assembly.json`. */
export interface AssemblyManifest {
  source_pipeline: string;
  source_revision: number;
  harness_name: string;
  options?: string[];
  required_tools?: unknown[];
  phases: AssemblyPhase[];
}

/** The part of `casts/claude/skills/<skill>/_provenance.json` this repository reads. */
export interface SkillProvenance {
  provenance_schema_version?: number;
  cast_target?: string;
  mold?: {
    name?: string;
    path?: string;
    revision?: number;
    content_hash?: string;
    commit?: string;
  };
  artifacts?: Partial<ProvenanceArtifacts>;
}

/**
 * One artifact a pipeline can put on disk, with every phase that declares it.
 *
 * `producing_phases` stays an array on purpose. `open-requirements.ledger.yml` is declared by
 * seventeen Molds and `galaxy-workflow-draft.gxwf.yml` by seven, two of which sit in the same
 * pipeline — collapsing to one phase would be picking a winner the declarations do not name.
 */
export interface DeclaredOutput {
  id: string;
  kind: string;
  default_filename: string;
  schema?: string;
  optional: boolean;
  description: string;
  producing_phases: number[];
  producing_skills: string[];
  consuming_phases: number[];
  consuming_skills: string[];
  source: "mold" | "runtime";
}

export function skillsRoot(repoRoot: string): string {
  return path.join(repoRoot, "casts", "claude", "skills");
}

export function assemblyPath(repoRoot: string, pipeline: string): string {
  if (!CAST_SLUG.test(pipeline)) throw new Error(`invalid pipeline slug: ${pipeline}`);
  return path.join(skillsRoot(repoRoot), `pipeline-${pipeline}`, "_assembly.json");
}

export function skillDir(repoRoot: string, skill: string): string {
  if (!CAST_SLUG.test(skill)) throw new Error(`invalid skill slug: ${skill}`);
  return path.join(skillsRoot(repoRoot), skill);
}

export function loadAssembly(repoRoot: string, pipeline: string): AssemblyManifest {
  const file = assemblyPath(repoRoot, pipeline);
  if (!existsSync(file)) throw new Error(`pipeline assembly not found: ${file}`);
  const manifest = JSON.parse(readFileSync(file, "utf8")) as Partial<AssemblyManifest>;
  if (
    manifest.source_pipeline !== pipeline ||
    typeof manifest.source_revision !== "number" ||
    typeof manifest.harness_name !== "string" ||
    !Array.isArray(manifest.phases)
  ) {
    throw new Error(`${file}: invalid pipeline assembly`);
  }
  return manifest as AssemblyManifest;
}

/** Every pipeline slug with a committed assembled harness, sorted. */
export function listPipelineSlugs(repoRoot: string): string[] {
  const root = skillsRoot(repoRoot);
  if (!existsSync(root)) return [];
  return readdirSync(root)
    .filter((name) => name.startsWith("pipeline-"))
    .map((name) => name.slice("pipeline-".length))
    .filter((slug) => CAST_SLUG.test(slug))
    .filter((slug) => existsSync(assemblyPath(repoRoot, slug)))
    .sort();
}

/** Every cast skill bundle in the tree, harness skills excluded. */
export function listSkillSlugs(repoRoot: string): string[] {
  const root = skillsRoot(repoRoot);
  if (!existsSync(root)) return [];
  return readdirSync(root)
    .filter((name) => !name.startsWith("pipeline-") && !name.startsWith("_"))
    .filter((name) => CAST_SLUG.test(name))
    .filter((name) => existsSync(path.join(root, name, "_provenance.json")))
    .sort();
}

/**
 * Declared filename to the skills that emit it, across every cast in the tree.
 *
 * Wider than any one pipeline on purpose: the per-step loop invokes Molds that are not phases of
 * anything, and their outputs land in the run directory all the same.
 */
export function declaringSkillsByFilename(repoRoot: string): Map<string, string[]> {
  const index = new Map<string, string[]>();
  for (const skill of listSkillSlugs(repoRoot)) {
    for (const out of loadSkillProvenance(repoRoot, skill)?.artifacts?.produces ?? []) {
      if (typeof out?.default_filename !== "string") continue;
      const owners = index.get(out.default_filename) ?? [];
      if (!owners.includes(skill)) owners.push(skill);
      index.set(out.default_filename, owners);
    }
  }
  return index;
}

export function loadAllAssemblies(repoRoot: string): AssemblyManifest[] {
  return listPipelineSlugs(repoRoot).map((slug) => loadAssembly(repoRoot, slug));
}

export function loadSkillProvenance(repoRoot: string, skill: string): SkillProvenance | null {
  if (!CAST_SLUG.test(skill)) return null;
  const file = path.join(skillDir(repoRoot, skill), "_provenance.json");
  if (!existsSync(file)) return null;
  return JSON.parse(readFileSync(file, "utf8")) as SkillProvenance;
}

/** The skills a phase can invoke: its own, or every non-sentinel step of a branch chain. */
export function phaseSkills(phase: AssemblyPhase): string[] {
  if (phase.skill) return [phase.skill];
  if (Array.isArray(phase.chain)) {
    return phase.chain.filter((step) => typeof step === "string" && !TERMINAL_SENTINELS.has(step));
  }
  return [];
}

function ensure(
  index: Map<string, DeclaredOutput>,
  id: string,
  seed: () => DeclaredOutput,
): DeclaredOutput {
  let entry = index.get(id);
  if (!entry) {
    entry = seed();
    index.set(id, entry);
  }
  return entry;
}

function pushUnique<T>(list: T[], value: T): void {
  if (!list.includes(value)) list.push(value);
}

/**
 * Every artifact this pipeline's phases declare, keyed by id.
 *
 * Runtime artifacts join the same index: `runtime_artifacts.yml` names files that land in the run
 * directory exactly as a Mold output does, and a reader that only knew about Mold outputs would
 * call the feedback ledger undeclared.
 */
export function declaredOutputs(
  repoRoot: string,
  manifest: AssemblyManifest,
  runtimeArtifacts?: RuntimeArtifactRegistry,
): DeclaredOutput[] {
  const index = new Map<string, DeclaredOutput>();

  for (const phase of manifest.phases) {
    for (const skill of phaseSkills(phase)) {
      const provenance = loadSkillProvenance(repoRoot, skill);
      if (!provenance) continue;
      for (const out of provenance.artifacts?.produces ?? []) {
        if (typeof out?.id !== "string") continue;
        const entry = ensure(index, out.id, () => ({
          id: out.id,
          kind: out.kind ?? "other",
          default_filename: out.default_filename,
          schema: out.schema,
          optional: out.optional === true,
          description: out.description ?? "",
          producing_phases: [],
          producing_skills: [],
          consuming_phases: [],
          consuming_skills: [],
          source: "mold",
        }));
        if (out.schema && !entry.schema) entry.schema = out.schema;
        if (out.optional !== true) entry.optional = false;
        pushUnique(entry.producing_phases, phase.phase);
        pushUnique(entry.producing_skills, skill);
      }
      for (const input of provenance.artifacts?.consumes ?? []) {
        if (typeof input?.id !== "string") continue;
        const entry = index.get(input.id);
        if (!entry) continue;
        pushUnique(entry.consuming_phases, phase.phase);
        pushUnique(entry.consuming_skills, skill);
      }
    }
  }

  for (const runtime of runtimeArtifacts?.artifacts.values() ?? []) {
    if (index.has(runtime.id)) continue;
    index.set(runtime.id, {
      id: runtime.id,
      kind: runtime.kind,
      default_filename: runtime.default_filename,
      optional: true,
      description: `Runtime artifact initialized by the harness (${runtime.protocol}).`,
      producing_phases: [],
      producing_skills: [],
      consuming_phases: [],
      consuming_skills: [],
      source: "runtime",
    });
  }

  return [...index.values()].sort((a, b) => a.id.localeCompare(b.id));
}
