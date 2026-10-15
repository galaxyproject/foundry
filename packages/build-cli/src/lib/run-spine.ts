// The parts of a `RunModel` every reader builds the same way.
//
// A harness run and a `test-pipeline` evaluation disagree about where status and files come from,
// and agree about everything the assembly and the declarations say. Each reader works out what it
// observed and hands it here; the rows, the counts and the rollup are built once.

import type { RuntimeArtifactRegistry } from "@galaxy-foundry/gxwf-foundry-note-schema";

import {
  loadSkillProvenance,
  phaseSkills,
  type AssemblyPhase,
  type DeclaredOutput,
} from "./cast-registry.js";
import type { SiteLinker } from "./run-links.js";
import { derivePreview } from "./run-preview.js";
import type { PipelineIndex } from "./run-reconstruct.js";
import type { ScannedEntry } from "./run-scan.js";
import {
  RUN_MANIFEST_SCHEMA_VERSION,
  worstState,
  type ArtifactPresence,
  type ArtifactValidation,
  type ArtifactVariant,
  type ArtifactWrite,
  type HealthRollup,
  type HealthTile,
  type PhaseStatus,
  type PhaseStatusSource,
  type RunArtifact,
  type RunModel,
  type RunPhase,
} from "./run-model.js";

/** What every run reader is given besides the run itself. */
export interface RunReaderOptions {
  repoRoot: string;
  runtimeArtifacts?: RuntimeArtifactRegistry;
  pipelineIndex?: PipelineIndex;
  linker?: SiteLinker;
  now?: () => Date;
  packageVersion?: string;
  foundryHead?: string | null;
}

/** The leading fields of a model: its version and who generated it. */
export function modelHeader(
  options: Pick<RunReaderOptions, "now" | "packageVersion" | "foundryHead">,
): Pick<RunModel, "run_manifest_schema_version" | "generated_at" | "generator"> {
  const now = options.now ?? (() => new Date());
  return {
    run_manifest_schema_version: RUN_MANIFEST_SCHEMA_VERSION,
    generated_at: now().toISOString(),
    generator: {
      command: "run-dashboard",
      foundry_head: options.foundryHead ?? null,
      package_version: options.packageVersion ?? "0.0.0",
    },
  };
}

/** What a reader observed about one phase; everything else comes from the assembly. */
export interface PhaseObservation {
  selected: string | null;
  iterations: number | null;
  status: PhaseStatus;
  status_source: PhaseStatusSource;
  feedback_checked: boolean | null;
  commits: string[];
}

/** One phase row: the assembled phase, its skills' declarations, and what the reader saw. */
export function buildPhaseRow(
  repoRoot: string,
  phase: AssemblyPhase,
  linker: SiteLinker,
  observed: PhaseObservation,
): RunPhase {
  const produces = new Set<string>();
  const consumes = new Set<string>();
  for (const skill of phaseSkills(phase)) {
    const provenance = loadSkillProvenance(repoRoot, skill);
    for (const out of provenance?.artifacts?.produces ?? []) {
      if (typeof out?.id === "string") produces.add(out.id);
    }
    for (const input of provenance?.artifacts?.consumes ?? []) {
      if (typeof input?.id === "string") consumes.add(input.id);
    }
  }

  const skill = phase.skill ?? null;
  const mold = skill ? loadSkillProvenance(repoRoot, skill)?.mold : undefined;

  return {
    n: phase.phase,
    kind: phase.kind,
    skill,
    pattern: phase.pattern ?? null,
    chain: Array.isArray(phase.chain) ? phase.chain : [],
    selected: observed.selected,
    loop: phase.loop === true,
    iterations: observed.iterations,
    status: observed.status,
    status_source: observed.status_source,
    feedback_checked: observed.feedback_checked,
    produces: [...produces].sort(),
    consumes: [...consumes].sort(),
    mold:
      mold?.path && typeof mold.revision === "number"
        ? { path: mold.path, revision: mold.revision, content_hash: mold.content_hash ?? "" }
        : null,
    site_href: skill ? linker.mold(skill) : null,
    commits: observed.commits,
  };
}

/**
 * Whether a declared artifact is on disk, and if not, whether it should be by now.
 *
 * Due means its earliest producing phase is no later than the furthest phase the run reached.
 */
export function resolvePresence(
  output: DeclaredOutput,
  entry: ScannedEntry | null,
  furthest: number,
): ArtifactPresence {
  if (entry) return "present";
  if (output.optional) return "optional-absent";
  const due = output.producing_phases.length
    ? Math.min(...output.producing_phases)
    : Number.POSITIVE_INFINITY;
  return due <= furthest ? "missing" : "not-yet-due";
}

/** What a reader observed about one declared artifact. */
export interface ArtifactObservation {
  entry: ScannedEntry | null;
  presence: ArtifactPresence;
  written_by_phase: number | null;
  writes: ArtifactWrite[];
  variants: ArtifactVariant[];
  validation: ArtifactValidation | null;
  /** Where the reader expected it, when that is known without the file. Defaults to the entry's. */
  path?: string | null;
  /** A digest the run recorded, preferred over one computed from the file. */
  sha256?: string | null;
}

/** One artifact row: the declaration, and what the reader found for it. */
export function toRunArtifact(
  output: DeclaredOutput,
  linker: SiteLinker,
  observed: ArtifactObservation,
): RunArtifact {
  const entry = observed.entry;
  return {
    id: output.id,
    declared_filename: output.default_filename,
    kind: output.kind,
    schema: output.schema ?? null,
    schema_href: output.schema ? linker.schema(output.schema) : null,
    description: output.description,
    optional: output.optional,
    source: output.source,
    producing_phases: [...output.producing_phases].sort((a, b) => a - b),
    producing_skills: [...output.producing_skills].sort(),
    consuming_phases: [...output.consuming_phases].sort((a, b) => a - b),
    written_by_phase: observed.written_by_phase,
    presence: observed.presence,
    path: observed.path ?? entry?.relpath ?? null,
    size_bytes: entry?.size_bytes ?? null,
    mtime: entry?.mtime ?? null,
    sha256: observed.sha256 ?? entry?.sha256 ?? null,
    hash_skipped_reason: entry?.hash_skipped_reason ?? null,
    variants: observed.variants,
    writes: observed.writes,
    preview: entry ? derivePreview(output.id, output.kind, entry) : null,
    validation: observed.validation,
    site_href: linker.artifact(output.id),
  };
}

export interface PresenceCounts {
  /** Every artifact that is due, present or not. */
  expected: number;
  present: number;
  missing: number;
  failed: number;
}

export function presenceCounts(artifacts: RunArtifact[]): PresenceCounts {
  const count = (presence: ArtifactPresence) =>
    artifacts.filter((artifact) => artifact.presence === presence).length;
  return {
    expected: artifacts.filter((artifact) => artifact.presence !== "not-yet-due").length,
    present: count("present"),
    missing: count("missing"),
    failed: count("failed"),
  };
}

/** The `phases` tile, which reads the same for every shape; only its detail line differs. */
export function phasesTile(phases: RunPhase[], detail: string): HealthTile {
  const done = phases.filter((phase) => phase.status === "done").length;
  const failed = phases.some((phase) => phase.status === "failed");
  return {
    label: "phases",
    state: failed ? "error" : done === phases.length ? "ok" : "warn",
    value: `${done}/${phases.length}`,
    detail,
    anchor: "#phases",
  };
}

/** The rollup around a reader's own tiles. */
export function healthRollup(
  tiles: HealthTile[],
  input: {
    phases: RunPhase[];
    furthest: number;
    counts: PresenceCounts;
    filesAttributed: number;
    filesSeen: number;
  },
): HealthRollup {
  return {
    overall: worstState(tiles.map((tile) => tile.state)),
    tiles,
    furthest_phase: input.furthest,
    total_phases: input.phases.length,
    artifacts_present: input.counts.present,
    artifacts_expected: input.counts.expected,
    artifacts_missing: input.counts.missing,
    files_attributed: input.filesAttributed,
    files_seen: input.filesSeen,
  };
}
