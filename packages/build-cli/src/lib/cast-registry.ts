// Canonical readers for the committed cast tree: assembled pipeline harnesses and the per-skill
// provenance records beside them.
//
// The assembly contract (types and the checked loader) ships in
// @galaxy-foundry/gxwf-foundry-note-schema, shared with the writer and the site; this module adds
// where the claude cast tree keeps it. Callers narrow, they do not re-describe.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import {
  ASSEMBLY_FILE,
  loadAssemblyManifest,
  type AssemblyManifest,
  type AssemblyPhase,
  type RuntimeArtifactRegistry,
} from "@galaxy-foundry/gxwf-foundry-note-schema";

import type { ProvenanceArtifacts } from "./artifact-contract.js";

export type {
  AssemblyBranchPhase,
  AssemblyManifest,
  AssemblyMoldPhase,
  AssemblyPhase,
} from "@galaxy-foundry/gxwf-foundry-note-schema";

export const CAST_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Sentinel names for a branch chain that does not mark its own: not skills, hand-offs to the user. */
export const TERMINAL_SENTINELS = new Set(["user-supplied"]);

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
  return path.join(skillsRoot(repoRoot), `pipeline-${pipeline}`, ASSEMBLY_FILE);
}

export function skillDir(repoRoot: string, skill: string): string {
  if (!CAST_SLUG.test(skill)) throw new Error(`invalid skill slug: ${skill}`);
  return path.join(skillsRoot(repoRoot), skill);
}

export function loadAssembly(repoRoot: string, pipeline: string): AssemblyManifest {
  return loadAssemblyManifest(assemblyPath(repoRoot, pipeline), pipeline);
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

/**
 * The skills a phase can invoke: its own, or every non-sentinel step of a branch chain.
 *
 * The assembler records a sentinel step — any chain entry that is not a Mold link — as a null
 * `cast_present`. A chain without one entry per step falls back to the known sentinel names.
 */
export function phaseSkills(phase: AssemblyPhase): string[] {
  if (phase.skill) return [phase.skill];
  if (!Array.isArray(phase.chain)) return [];
  const cast = phase.cast_present;
  const marked = Array.isArray(cast) && cast.length === phase.chain.length ? cast : null;
  return phase.chain.filter(
    (step, i) =>
      typeof step === "string" && (marked ? marked[i] !== null : !TERMINAL_SENTINELS.has(step)),
  );
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
