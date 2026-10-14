// The normalized shape of one conversion run.
//
// Types only, plus the schema version. This module deliberately imports nothing that touches the
// filesystem, so the site, the Pi harness, or any later reader can depend on the vocabulary
// without dragging in the reader. Everything that needs `node:fs` lives in its siblings.

export const RUN_MANIFEST_SCHEMA_VERSION = 1;

/** Which on-disk layout the model was read from. */
export type RunShape = "harness" | "test-pipeline";

/**
 * Whether the run told us what it was, or we worked it out afterwards.
 *
 * `recorded` means a `foundry-run.yml` named the pipeline, the phase order, the loop counts and
 * the branch selections. `reconstructed` means those were inferred from filenames, a feedback
 * ledger header, and checkpoint history — which cannot recover loop iterations at all and cannot
 * separate pipelines that declare the same filenames.
 */
export type RunProvenance = "recorded" | "reconstructed";

export type RunStatus = "running" | "complete" | "failed" | "cancelled" | "unknown";
export type PhaseStatus = "pending" | "running" | "done" | "failed" | "skipped" | "unknown";
export type PhaseStatusSource =
  | "run-record"
  | "feedback-ledger"
  | "git"
  | "artifact-presence"
  | "unknown";

/**
 * Whether a declared artifact is on disk, and whether its absence is a problem.
 *
 * `missing` is the only red one: the phase that declares it has been reached and the file is not
 * there. `not-yet-due` is the run simply not having got that far.
 */
export type ArtifactPresence = "present" | "missing" | "not-yet-due" | "optional-absent";

export type HealthState = "ok" | "warn" | "error";

/** How a file in the run directory relates to what the pipeline declares. */
export type UnmappedClass =
  | "derivative"
  | "cross-pipeline"
  | "sub-mold"
  | "tool-output"
  | "narrative"
  | "directory"
  | "undeclared";

export interface RunWarning {
  code: string;
  message: string;
  subject?: string;
}

export interface ArtifactVariant {
  basename: string;
  suffix: string;
  size_bytes: number;
  mtime: string;
  sha256: string | null;
  bytes_delta: number | null;
}

export interface ArtifactWrite {
  at: string | null;
  phase: number | null;
  iteration: number | null;
}

export type DerivedView =
  | {
      kind: "gxwf-steps";
      class: string | null;
      inputs: string[];
      outputs: string[];
      steps: Array<{
        id: string;
        label: string | null;
        tool_id: string | null;
        drafty: boolean;
        todos: string[];
      }>;
    }
  | { kind: "validation-summary"; status: string | null; rows: Array<[string, string]> }
  | {
      kind: "test-result";
      result: string | null;
      counts: Array<[string, string]>;
      cases: Array<{ name: string; status: string }>;
    }
  | { kind: "tool-pins"; pins: Array<Record<string, string>> }
  | { kind: "key-value"; pairs: Array<[string, string]> };

export interface ArtifactPreview {
  mode: "json" | "yaml" | "markdown" | "text" | "tail" | "none";
  embedded: boolean;
  truncated: boolean;
  bytes_embedded: number;
  body: string | null;
  outline: Array<{ depth: number; text: string }> | null;
  derived: DerivedView | null;
  skip_reason: string | null;
}

export interface ArtifactValidation {
  validator: string | null;
  status: string;
  exit_code: number | null;
  stdout: string | null;
  stderr: string | null;
}

export interface RunArtifact {
  id: string;
  declared_filename: string;
  kind: string;
  schema: string | null;
  schema_href: string | null;
  description: string;
  optional: boolean;
  source: "mold" | "runtime";
  /** Every phase declaring this id. Never collapsed: many Molds declare the same filename. */
  producing_phases: number[];
  producing_skills: string[];
  consuming_phases: number[];
  /** The phase the run record says actually wrote it. Null when the model was reconstructed. */
  written_by_phase: number | null;
  presence: ArtifactPresence;
  /** Relative to wherever the dashboard is written, so a file:// link resolves. */
  path: string | null;
  size_bytes: number | null;
  mtime: string | null;
  sha256: string | null;
  hash_skipped_reason: string | null;
  variants: ArtifactVariant[];
  writes: ArtifactWrite[];
  preview: ArtifactPreview | null;
  validation: ArtifactValidation | null;
  site_href: string | null;
}

export interface UnmappedFile {
  relpath: string;
  class: UnmappedClass;
  size_bytes: number;
  mtime: string;
  sha256: string | null;
  attached_to: string | null;
  declared_by_pipelines: string[];
  declared_by_skills: string[];
  dir_summary: { entry_count: number; total_bytes: number; sample: string[] } | null;
  preview: ArtifactPreview | null;
}

export interface RunPhase {
  n: number;
  kind: string;
  skill: string | null;
  pattern: string | null;
  chain: string[];
  selected: string | null;
  loop: boolean;
  iterations: number | null;
  status: PhaseStatus;
  status_source: PhaseStatusSource;
  feedback_checked: boolean | null;
  produces: string[];
  consumes: string[];
  mold: { path: string; revision: number; content_hash: string } | null;
  site_href: string | null;
  commits: string[];
}

export interface OpenRequirementsEntry {
  id: string;
  status: string;
  kind: string | null;
  blocking: boolean | null;
  raised_by: string | null;
  raised_by_phase: number | null;
  raised_by_href: string | null;
  resolved_by: string | null;
  resolved_by_phase: number | null;
  resolved_by_href: string | null;
  step: string | null;
  unmet: string | null;
  missing: string | null;
  supersedes: string | null;
  note: string | null;
  units: string | null;
  because: string | null;
}

export interface OpenRequirementsModel {
  path: string;
  entry_count: number;
  topology_repair: { escalations: number; cap: number; open_history: number[] } | null;
  counts: {
    open: number;
    resolved: number;
    surrendered: number;
    blocking_open: number;
    dropped: number;
  };
  entries: OpenRequirementsEntry[];
}

export interface FeedbackEntry {
  id: string;
  raised_by: string | null;
  raised_by_phase: number | null;
  kind: string | null;
  severity: string | null;
  status: string | null;
  what: string | null;
  expected: string | null;
  evidence: string | null;
  issue: string | null;
  subject_kind: string | null;
  subject_label: string | null;
  subject_locator: string | null;
  subject_href: string | null;
  observed_revision: number | null;
  observed_foundry_head: string | null;
}

export interface FeedbackLedgerModel {
  path: string;
  run: { pipeline: string | null; run_slug: string | null; status: string | null };
  counts: {
    total: number;
    by_kind: Record<string, number>;
    by_severity: Record<string, number>;
    by_status: Record<string, number>;
  };
  entries: FeedbackEntry[];
}

export interface RunCommit {
  sha: string;
  short: string;
  date: string;
  subject: string;
  phase: number | null;
  step: number | null;
  attempt: number | null;
  label: string;
  kind: "phase" | "step" | "ad-hoc";
  failed: boolean;
  files: Array<{ path: string; added: number; deleted: number }>;
}

export interface RunTimeline {
  head: string;
  commit_count: number;
  /** Newest first, matching `git log`. */
  commits: RunCommit[];
  size_series: Array<{
    artifact_id: string;
    filename: string;
    points: Array<{ sha: string; short: string; date: string; bytes: number }>;
  }>;
}

export interface EvaluationModel {
  engine: { name: string; provider: string; model: string; thinking: string | null };
  sandbox: { mode: string; network_policy: string };
  usage: Record<string, number>;
  trials: Array<{
    trial: number;
    status: string;
    phase_count: number;
    failed_phase: number | null;
  }>;
  selected_trial: number;
  duration_ms: number;
}

export interface HealthTile {
  label: string;
  state: HealthState;
  value: string;
  detail: string;
  anchor: string;
}

export interface HealthRollup {
  overall: HealthState;
  tiles: HealthTile[];
  furthest_phase: number;
  total_phases: number;
  artifacts_present: number;
  artifacts_expected: number;
  artifacts_missing: number;
  files_attributed: number;
  files_seen: number;
}

export interface RunIdentity {
  shape: RunShape;
  provenance: RunProvenance;
  slug: string;
  dir: string;
  pipeline: string;
  pipeline_source_revision: number;
  harness_name: string;
  assembly_sha256: string | null;
  /** False when the committed assembly has changed since the run read it. */
  assembly_matches_checkout: boolean;
  foundry_head: string | null;
  options_observed: string[];
  status: RunStatus;
  started_at: string | null;
  finished_at: string | null;
  total_bytes: number;
}

export interface RunModel {
  run_manifest_schema_version: typeof RUN_MANIFEST_SCHEMA_VERSION;
  generated_at: string;
  generator: {
    command: "run-dashboard";
    foundry_head: string | null;
    package_version: string;
  };
  run: RunIdentity;
  phases: RunPhase[];
  artifacts: RunArtifact[];
  unmapped: UnmappedFile[];
  ignored_count: number;
  open_requirements: OpenRequirementsModel | null;
  feedback: FeedbackLedgerModel | null;
  timeline: RunTimeline | null;
  evaluation: EvaluationModel | null;
  health: HealthRollup;
  warnings: RunWarning[];
}

export function isMissing(artifact: RunArtifact): boolean {
  return artifact.presence === "missing";
}

export function worstState(states: HealthState[]): HealthState {
  if (states.includes("error")) return "error";
  if (states.includes("warn")) return "warn";
  return "ok";
}
