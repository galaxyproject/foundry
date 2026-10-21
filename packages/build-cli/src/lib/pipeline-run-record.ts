// The `run.json` a `foundry-build test-pipeline` run writes at the top of its run directory.
//
// Types, and the one helper for walking them, shared by the command that writes the record and the
// dashboard reader that reads it back, so the two cannot drift apart.

import type {
  ArtifactResult,
  ContainerNetworkPolicy,
  PiSkillRunRecord,
  PiThinkingLevel,
  RunStatus,
  SandboxMode,
} from "@galaxy-foundry/gxwf-pi-harness";

export const PIPELINE_RUN_FILE = "run.json";

/**
 * A phase's or trial's outcome. `blocked` is a phase only the controller can end in: it needs
 * something no worker can supply, such as test data only a person can provide.
 */
export type PipelineOutcome = RunStatus | "blocked";

/** A run's outcome, or `running` while the run has not finished. */
export type PipelineRunStatus = PipelineOutcome | "running";

export interface PipelineScenario {
  name: string;
  source_path: string;
  fixture_path: string;
  fixture_sha256: string;
}

export interface PromotedArtifact {
  id: string;
  path: string;
  sha256: string;
  producer_phase: number;
}

/** One Pi worker's part in a run: a phase, or one iteration of a loop phase. */
export interface PipelineWorkerRunRecord {
  status: RunStatus;
  // The worker's own kind when it failed; a timed-out or cancelled worker's status says it alone.
  // The controller adds its own: a promotion it refused, a loop that stalled, was blocked or hit
  // its cap, a branch leg that broke the chain's contract, or a run budget spent before the worker
  // could start.
  failure_kind?:
    | PiSkillRunRecord["failure_kind"]
    | "artifact_promotion"
    | "loop_no_progress"
    | "loop_blocked"
    | "loop_cap"
    | "branch_contract"
    | "budget";
  error?: string;
  run_dir: string;
  worker_run_id?: string;
  worker_run_path?: string;
  trace_path?: string;
  stderr_path?: string;
  resolved_inputs: PromotedArtifact[];
  missing_input_ids: string[];
  artifacts: ArtifactResult[];
  usage?: PiSkillRunRecord["usage"];
}

export interface PipelineLoopIterationRecord extends PipelineWorkerRunRecord {
  iteration: number;
  /** The work the loop oracle picked for this call; null for the terminal call. */
  next_step: string[] | null;
}

export interface PipelineBranchLegRecord extends PipelineWorkerRunRecord {
  /** Position in the branch's chain, from 1. */
  leg: number;
  skill: string;
  /** What the leg's output still left unresolved; null when the leg did not pass. */
  unresolved: string[] | null;
}

export interface PipelinePhaseRunRecord extends Omit<PipelineWorkerRunRecord, "status"> {
  status: PipelineOutcome;
  phase: number;
  /** The phase's skill; a branch phase's pattern name. */
  skill: string;
  /** A branch phase's: those of the leg it entered with. */
  declared_input_ids: string[];
  /**
   * A loop phase's calls, in order. Its own `run_dir` then holds one directory per iteration,
   * its `artifacts` are the latest each id was written, and its `usage` sums the iterations.
   */
  iterations?: PipelineLoopIterationRecord[];
  /** A branch phase's legs that ran, in chain order, laid out and summed like `iterations`. */
  legs?: PipelineBranchLegRecord[];
}

/** Where a run started past phase 1 got the artifacts of the phases before its first. */
export interface PipelineSeedRecord {
  /** The earlier run's directory, absolute. */
  run_dir: string;
  run_id: string;
  trial: number;
  /** The earlier run's, which may differ from this run's own. */
  assembly_sha256: string;
  /** The first phase this run ran. */
  from_phase: number;
  /** The earlier trial's phases before `from_phase`, as they ended there. */
  phases: { phase: number; skill: string; status: PipelineOutcome }[];
  /** What those phases that passed carried forward, copied under this run's `seed/`. */
  artifacts: PromotedArtifact[];
}

/** The workers a phase ran, in order: its loop iterations, its branch legs, or the phase itself. */
export function phaseWorkers(
  phase: PipelinePhaseRunRecord,
): (PipelinePhaseRunRecord | PipelineLoopIterationRecord | PipelineBranchLegRecord)[] {
  if (phase.iterations?.length) return phase.iterations;
  if (phase.legs?.length) return phase.legs;
  return [phase];
}

export interface PipelineTrialRunRecord {
  trial: number;
  status: PipelineOutcome;
  phases: PipelinePhaseRunRecord[];
}

export interface PipelineRunRecord {
  pipeline_run_schema_version: 1;
  run_id: string;
  status: PipelineRunStatus;
  started_at: string;
  /** Null until the last trial ends. */
  finished_at: string | null;
  duration_ms: number;
  pipeline: string;
  source_revision: number;
  harness_name: string;
  assembly_path: string;
  assembly_sha256: string;
  foundry_head: string | null;
  through_phase: number;
  /** Set on a run started past phase 1 from an earlier run's artifacts. */
  seed?: PipelineSeedRecord;
  scenario: PipelineScenario;
  engine: {
    name: "pi";
    provider: string;
    model: string;
    thinking?: PiThinkingLevel;
  };
  sandbox: {
    mode: SandboxMode;
    image?: string;
    network_policy: ContainerNetworkPolicy | "host";
    credential_env: string[];
    credential_auth_store: "pi-test-auth" | "none";
  };
  /** Absent from records written before runs could be read mid-flight. */
  trials_requested?: number;
  trials: PipelineTrialRunRecord[];
  usage: {
    input_tokens: number;
    output_tokens: number;
    cache_read_tokens: number;
    cache_write_tokens: number;
    total_tokens: number;
    cost: number;
    turns: number;
    tool_calls: number;
  };
}
