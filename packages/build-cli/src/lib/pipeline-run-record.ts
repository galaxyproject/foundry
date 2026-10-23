// The `run.json` a `foundry-build test-pipeline` run writes at the top of its run directory.
//
// Types only, shared by the command that writes the record and the dashboard reader that reads it
// back, so the two cannot drift apart.

import type {
  ArtifactResult,
  ContainerNetworkPolicy,
  PiSkillRunRecord,
  PiThinkingLevel,
  RunStatus,
  SandboxMode,
} from "@galaxy-foundry/gxwf-pi-harness";

export const PIPELINE_RUN_FILE = "run.json";

/** A trial's or phase's outcome, or `running` while the run has not finished. */
export type PipelineRunStatus = RunStatus | "running";

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

export interface PipelinePhaseRunRecord {
  phase: number;
  skill: string;
  status: RunStatus;
  // The worker's own kind when it failed; a timed-out or cancelled worker's status says it alone.
  failure_kind?: PiSkillRunRecord["failure_kind"] | "artifact_promotion";
  error?: string;
  run_dir: string;
  worker_run_id?: string;
  worker_run_path?: string;
  trace_path?: string;
  stderr_path?: string;
  declared_input_ids: string[];
  resolved_inputs: PromotedArtifact[];
  missing_input_ids: string[];
  artifacts: ArtifactResult[];
  usage?: PiSkillRunRecord["usage"];
}

export interface PipelineTrialRunRecord {
  trial: number;
  status: RunStatus;
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
