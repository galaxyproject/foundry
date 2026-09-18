// Reads an evaluation run into the same model as an agent-driven one.
//
// `foundry-build test-pipeline` already writes a versioned `run.json` with per-phase status,
// artifact hashes, validator results and token cost — everything the harness shape has to
// reconstruct, plus things it can never have. The two are different objects and the model does not
// pretend otherwise: `evaluation` is populated only here, and `timeline` only there. What they
// share is the spine, so one reader and one page serve both.

import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import type { RuntimeArtifactRegistry } from "@galaxy-foundry/gxwf-foundry-note-schema";

import {
  assemblyPath,
  declaredOutputs,
  loadSkillProvenance,
  phaseSkills,
} from "./cast-registry.js";
import { buildPipelineIndex, type PipelineIndex } from "./run-reconstruct.js";
import { derivePreview } from "./run-preview.js";
import { readRunRecord } from "./run-record.js";
import { sha256File, type ScannedEntry } from "./run-scan.js";
import {
  RUN_MANIFEST_SCHEMA_VERSION,
  worstState,
  type ArtifactPresence,
  type EvaluationModel,
  type HealthState,
  type HealthTile,
  type PhaseStatus,
  type RunArtifact,
  type RunModel,
  type RunPhase,
  type RunStatus,
  type RunWarning,
} from "./run-model.js";
import type { SiteLinker } from "./run-manifest.js";

/** The subset of `PipelineRunRecord` this reader needs, kept structural to avoid a cycle. */
interface PipelineArtifactResult {
  id: string;
  path: string;
  status: string;
  sha256?: string;
  validator?: {
    bin: string;
    args: string[];
    exit_code: number | null;
    stdout_path: string;
    stderr_path: string;
    error?: string;
  };
}

interface PipelinePhaseRecord {
  phase: number;
  skill: string;
  status: string;
  failure_kind?: string;
  error?: string;
  run_dir: string;
  declared_input_ids?: string[];
  missing_input_ids?: string[];
  artifacts?: PipelineArtifactResult[];
}

interface PipelineTrialRecord {
  trial: number;
  status: string;
  phases: PipelinePhaseRecord[];
}

interface PipelineRecord {
  pipeline_run_schema_version: number;
  run_id: string;
  status: string;
  started_at: string;
  finished_at: string;
  duration_ms: number;
  pipeline: string;
  source_revision: number;
  harness_name: string;
  assembly_sha256: string;
  through_phase: number;
  scenario?: { name: string };
  engine?: { name: string; provider: string; model: string; thinking?: string };
  sandbox?: { mode: string; network_policy?: string };
  trials: PipelineTrialRecord[];
  usage?: Record<string, number>;
}

export const PIPELINE_RUN_FILE = "run.json";

/**
 * Whether a directory is an evaluation run rather than a harness run.
 *
 * The two never collide: a harness run directory has no `run.json`, and `foundry-run.yml` is the
 * only thing a harness writes at the top level that this reader would look at.
 */
export function isTestPipelineRunDir(dir: string): boolean {
  const file = path.join(dir, PIPELINE_RUN_FILE);
  if (!existsSync(file)) return false;
  if (readRunRecord(dir).record) return false;
  try {
    const parsed = JSON.parse(readFileSync(file, "utf8")) as Partial<PipelineRecord>;
    return typeof parsed.pipeline_run_schema_version === "number";
  } catch {
    return false;
  }
}

const RUN_STATUS: Record<string, RunStatus> = {
  passed: "complete",
  failed: "failed",
  error: "failed",
  timed_out: "failed",
  cancelled: "cancelled",
};

const PHASE_STATUS: Record<string, PhaseStatus> = {
  passed: "done",
  failed: "failed",
  error: "failed",
  timed_out: "failed",
  cancelled: "skipped",
};

export interface TestPipelineAdapterOptions {
  runDir: string;
  repoRoot: string;
  /** Which trial to render. Defaults to the first that did not pass, else the first. */
  trial?: number;
  runtimeArtifacts?: RuntimeArtifactRegistry;
  pipelineIndex?: PipelineIndex;
  linker?: SiteLinker;
  now?: () => Date;
  packageVersion?: string;
  foundryHead?: string | null;
}

const NO_LINKS: SiteLinker = {
  artifact: () => null,
  mold: () => null,
  pipeline: () => null,
  harness: () => null,
  schema: () => null,
  note: () => null,
};

/** A workspace file read the same way the directory scanner would read one. */
function scanOne(
  absolute: string,
  relpath: string,
  maxEmbedBytes = 256 * 1024,
): ScannedEntry | null {
  if (!existsSync(absolute)) return null;
  const stats = statSync(absolute);
  if (!stats.isFile()) return null;
  let text: string | null = null;
  let skip: string | null = null;
  if (stats.size > maxEmbedBytes) {
    skip = `over the per-file embed cap (${(stats.size / 1024).toFixed(1)} KB)`;
  } else {
    try {
      const buffer = readFileSync(absolute);
      if (buffer.includes(0)) skip = "binary content";
      else text = buffer.toString("utf8");
    } catch (error) {
      skip = `unreadable: ${(error as Error).message}`;
    }
  }
  return {
    basename: path.basename(absolute),
    relpath,
    type: "file",
    size_bytes: stats.size,
    mtime: stats.mtime.toISOString(),
    sha256: stats.size <= 8 * 1024 * 1024 ? sha256File(absolute) : null,
    hash_skipped_reason: null,
    dir_summary: null,
    text,
    text_truncated: false,
    text_skip_reason: skip,
  };
}

export function runModelFromTestPipeline(options: TestPipelineAdapterOptions): RunModel {
  const runDir = path.resolve(options.runDir);
  const repoRoot = path.resolve(options.repoRoot);
  const now = options.now ?? (() => new Date());
  const linker = options.linker ?? NO_LINKS;
  const warnings: RunWarning[] = [];

  const record = JSON.parse(
    readFileSync(path.join(runDir, PIPELINE_RUN_FILE), "utf8"),
  ) as PipelineRecord;

  const index = options.pipelineIndex ?? buildPipelineIndex(repoRoot, options.runtimeArtifacts);
  const assembly = index.assemblies.get(record.pipeline);
  if (!assembly) throw new Error(`no assembled harness for pipeline: ${record.pipeline}`);
  const declared = index.declared.get(record.pipeline) ?? declaredOutputs(repoRoot, assembly);

  const assemblyFile = assemblyPath(repoRoot, record.pipeline);
  const currentSha = existsSync(assemblyFile)
    ? // The same digest `test-pipeline` recorded, so the two agree or the difference is real.
      sha256File(assemblyFile)
    : null;
  const assemblyMatches = record.assembly_sha256 === currentSha;
  if (!assemblyMatches) {
    warnings.push({
      code: "assembly-drifted",
      message:
        "the committed harness has changed since this evaluation ran, so phase numbers and declared artifacts describe today's pipeline",
      subject: record.pipeline,
    });
  }

  const trials = record.trials ?? [];
  const chosen =
    trials.find((trial) => trial.trial === options.trial) ??
    trials.find((trial) => trial.status !== "passed") ??
    trials[0];
  if (!chosen) throw new Error(`${PIPELINE_RUN_FILE} carries no trials`);
  if (options.trial !== undefined && chosen.trial !== options.trial) {
    warnings.push({
      code: "trial-not-found",
      message: `trial ${options.trial} is not in this record; showing trial ${chosen.trial}`,
    });
  }

  const phaseRecords = new Map(chosen.phases.map((phase) => [phase.phase, phase]));

  const phases: RunPhase[] = assembly.phases.map((phase) => {
    const ran = phaseRecords.get(phase.phase);
    const skills = phaseSkills(phase);
    const produces = new Set<string>();
    const consumes = new Set<string>();
    for (const skill of skills) {
      const provenance = loadSkillProvenance(repoRoot, skill);
      for (const out of provenance?.artifacts?.produces ?? []) {
        if (typeof out?.id === "string") produces.add(out.id);
      }
      for (const input of provenance?.artifacts?.consumes ?? []) {
        if (typeof input?.id === "string") consumes.add(input.id);
      }
    }
    const moldProvenance = phase.skill ? loadSkillProvenance(repoRoot, phase.skill) : null;
    const mold = moldProvenance?.mold;

    // A phase beyond `--through` was never selected, which is not the same as one that was
    // selected and did not run.
    const status: PhaseStatus = ran
      ? (PHASE_STATUS[ran.status] ?? "unknown")
      : phase.phase > record.through_phase
        ? "skipped"
        : "pending";

    return {
      n: phase.phase,
      kind: phase.kind,
      skill: phase.skill ?? null,
      pattern: phase.pattern ?? null,
      chain: Array.isArray(phase.chain) ? phase.chain : [],
      selected: null,
      loop: phase.loop === true,
      iterations: null,
      status,
      status_source: "run-record",
      feedback_checked: null,
      produces: [...produces].sort(),
      consumes: [...consumes].sort(),
      mold:
        mold?.path && typeof mold.revision === "number"
          ? { path: mold.path, revision: mold.revision, content_hash: mold.content_hash ?? "" }
          : null,
      site_href: phase.skill ? linker.mold(phase.skill) : null,
      commits: [],
    };
  });

  for (const phase of chosen.phases) {
    for (const missing of phase.missing_input_ids ?? []) {
      warnings.push({
        code: "missing-declared-input",
        message: `phase ${phase.phase} (${phase.skill}) declared input '${missing}' that no earlier phase promoted`,
        subject: missing,
      });
    }
  }

  // Each phase writes into its own workspace, so the same artifact id can appear more than once
  // across a run. The latest phase that produced it is the one the run carried forward.
  const produced = new Map<string, { phase: number; result: PipelineArtifactResult }>();
  for (const phase of chosen.phases) {
    for (const artifact of phase.artifacts ?? []) {
      produced.set(artifact.id, { phase: phase.phase, result: artifact });
    }
  }

  const furthest = Math.max(0, ...chosen.phases.map((phase) => phase.phase));

  const artifacts: RunArtifact[] = declared.map((output) => {
    const hit = produced.get(output.id);
    const phaseRecord = hit ? phaseRecords.get(hit.phase) : undefined;
    const relpath =
      hit && phaseRecord ? `${phaseRecord.run_dir}/workspace/${hit.result.path}` : null;
    const absolute = relpath ? path.join(runDir, relpath) : null;
    const entry = absolute ? scanOne(absolute, relpath!) : null;

    const presence: ArtifactPresence = entry
      ? "present"
      : output.optional
        ? "optional-absent"
        : output.producing_phases.length && Math.min(...output.producing_phases) <= furthest
          ? "missing"
          : "not-yet-due";

    const validator = hit?.result.validator;
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
      written_by_phase: hit?.phase ?? null,
      presence,
      path: relpath,
      size_bytes: entry?.size_bytes ?? null,
      mtime: entry?.mtime ?? null,
      sha256: hit?.result.sha256 ?? entry?.sha256 ?? null,
      hash_skipped_reason: null,
      variants: [],
      writes: hit ? [{ at: null, phase: hit.phase, iteration: null }] : [],
      preview: entry ? derivePreview(output.id, output.kind, entry) : null,
      validation: validator
        ? {
            validator: validator.bin,
            status: hit!.result.status,
            exit_code: validator.exit_code,
            stdout: validator.stdout_path,
            stderr: validator.stderr_path,
          }
        : null,
      site_href: linker.artifact(output.id),
    };
  });

  const evaluation: EvaluationModel = {
    engine: {
      name: record.engine?.name ?? "unknown",
      provider: record.engine?.provider ?? "unknown",
      model: record.engine?.model ?? "unknown",
      thinking: record.engine?.thinking ?? null,
    },
    sandbox: {
      mode: record.sandbox?.mode ?? "unknown",
      network_policy: record.sandbox?.network_policy ?? "unknown",
    },
    usage: record.usage ?? {},
    trials: trials.map((trial) => ({
      trial: trial.trial,
      status: trial.status,
      phase_count: trial.phases.length,
      failed_phase: trial.phases.find((phase) => phase.status !== "passed")?.phase ?? null,
    })),
    selected_trial: chosen.trial,
    duration_ms: record.duration_ms,
  };

  const present = artifacts.filter((artifact) => artifact.presence === "present").length;
  const missing = artifacts.filter((artifact) => artifact.presence === "missing").length;
  const expected = artifacts.filter((artifact) => artifact.presence !== "not-yet-due").length;
  const done = phases.filter((phase) => phase.status === "done").length;
  const failed = phases.filter((phase) => phase.status === "failed").length;
  const status = RUN_STATUS[record.status] ?? "unknown";

  const tiles: HealthTile[] = [
    {
      label: "run",
      state: status === "complete" ? "ok" : "error",
      value: record.status,
      detail: `trial ${chosen.trial} of ${trials.length}`,
      anchor: "#phases",
    },
    {
      label: "phases",
      state: failed ? "error" : done === phases.length ? "ok" : "warn",
      value: `${done}/${phases.length}`,
      detail: `evaluated through phase ${record.through_phase}`,
      anchor: "#phases",
    },
    {
      label: "artifacts",
      state: missing ? "error" : "ok",
      value: `${present}/${expected}`,
      detail: missing
        ? `${missing} declared artifact(s) not produced`
        : "every declared artifact was produced",
      anchor: "#artifacts",
    },
    {
      label: "cost",
      state: "ok",
      value: evaluation.usage.cost !== undefined ? `$${evaluation.usage.cost.toFixed(2)}` : "—",
      detail: `${evaluation.usage.total_tokens ?? 0} tokens over ${evaluation.usage.turns ?? 0} turns`,
      anchor: "#phases",
    },
    {
      label: "scenario",
      state: "ok",
      value: record.scenario?.name ? "bound" : "none",
      detail: record.scenario?.name ?? "no scenario recorded",
      anchor: "#phases",
    },
    {
      label: "inputs",
      state: warnings.some((warning) => warning.code === "missing-declared-input") ? "warn" : "ok",
      value: String(warnings.filter((warning) => warning.code === "missing-declared-input").length),
      detail: "declared inputs no earlier phase promoted",
      anchor: "#artifacts",
    },
  ];

  return {
    run_manifest_schema_version: RUN_MANIFEST_SCHEMA_VERSION,
    generated_at: now().toISOString(),
    generator: {
      command: "run-dashboard",
      foundry_head: options.foundryHead ?? null,
      package_version: options.packageVersion ?? "0.0.0",
    },
    run: {
      shape: "test-pipeline",
      provenance: "recorded",
      slug: record.scenario?.name ?? record.run_id,
      dir: runDir,
      pipeline: record.pipeline,
      pipeline_source_revision: record.source_revision,
      harness_name: record.harness_name,
      assembly_sha256: record.assembly_sha256,
      assembly_matches_checkout: assemblyMatches,
      foundry_head: null,
      options_observed: [`trial-${chosen.trial}`, record.sandbox?.mode ?? "unknown"],
      status,
      started_at: record.started_at,
      finished_at: record.finished_at,
      total_bytes: artifacts.reduce((sum, artifact) => sum + (artifact.size_bytes ?? 0), 0),
    },
    phases,
    artifacts,
    unmapped: [],
    ignored_count: 0,
    open_requirements: null,
    feedback: null,
    timeline: null,
    evaluation,
    health: {
      overall: worstState(tiles.map((tile) => tile.state) as HealthState[]),
      tiles,
      furthest_phase: furthest,
      total_phases: phases.length,
      artifacts_present: present,
      artifacts_expected: expected,
      artifacts_missing: missing,
      files_attributed: present,
      files_seen: present,
    },
    warnings,
  };
}
