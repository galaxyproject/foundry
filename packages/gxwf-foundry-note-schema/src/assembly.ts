import { existsSync, readFileSync } from "node:fs";

/** What `assemble-pipeline` writes beside a pipeline harness's `SKILL.md`. */
export const ASSEMBLY_FILE = "_assembly.json";

/**
 * A Mold phase of an assembled harness.
 *
 * The fields only the other kind carries are declared `never`, so a reader can ask any phase for
 * its `skill`, `pattern` or `chain` without narrowing first.
 */
export interface AssemblyMoldPhase {
  phase: number;
  kind: "mold";
  skill: string;
  cast_present: boolean;
  loop: boolean;
  pattern?: never;
  chain?: never;
}

/** A branch phase: a fallback chain of skills that may end on a sentinel such as `user-supplied`. */
export interface AssemblyBranchPhase {
  phase: number;
  kind: "branch";
  pattern: string;
  chain: string[];
  /** One per chain step; null where the step is a sentinel rather than a skill. */
  cast_present: Array<boolean | null>;
  skill?: never;
  loop?: never;
}

/** One entry of an assembled harness's `phases` array. */
export type AssemblyPhase = AssemblyMoldPhase | AssemblyBranchPhase;

/** `casts/<target>/<bundles>/pipeline-<slug>/_assembly.json`. */
export interface AssemblyManifest {
  source_pipeline: string;
  source_revision: number;
  harness_name: string;
  /** Runtime invocation flags the harness honors (e.g. `use-subagents`, `checkpoint`). */
  options?: string[];
  required_tools?: unknown[];
  phases: AssemblyPhase[];
}

/**
 * Read one pipeline's assembly, checking the fields every reader relies on.
 *
 * Where the file lives is the caller's: it depends on the cast target's bundle layout. Throws when
 * the file is missing or is not this pipeline's assembly.
 */
export function loadAssemblyManifest(file: string, pipeline: string): AssemblyManifest {
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
