// Reads an evaluation run into the same model as an agent-driven one.
//
// `foundry-build test-pipeline` already writes a versioned `run.json` with per-phase status,
// artifact hashes, validator results and token cost — everything the harness shape has to
// reconstruct, plus things it can never have. The two are different objects and the model does not
// pretend otherwise: `evaluation` is populated only here, and `timeline` only there. What they
// share is the spine, so one reader and one page serve both.

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import type { ArtifactResult } from "@galaxy-foundry/gxwf-pi-harness";

import { declaredOutputs } from "./cast-registry.js";
import { PIPELINE_RUN_FILE, type PipelineRunRecord } from "./pipeline-run-record.js";
import { NO_LINKS } from "./run-links.js";
import { buildPipelineIndex } from "./run-reconstruct.js";
import { assemblyMatchesCurrent, readRunRecord } from "./run-record.js";
import { scanFile } from "./run-scan.js";
import {
  buildPhaseRow,
  healthRollup,
  modelHeader,
  phasesTile,
  presenceCounts,
  resolvePresence,
  toRunArtifact,
  type RunReaderOptions,
} from "./run-spine.js";
import type {
  EvaluationModel,
  HealthTile,
  PhaseStatus,
  RunArtifact,
  RunModel,
  RunPhase,
  RunStatus,
  RunWarning,
} from "./run-model.js";

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
    const parsed = JSON.parse(readFileSync(file, "utf8")) as Partial<PipelineRunRecord>;
    return typeof parsed.pipeline_run_schema_version === "number";
  } catch {
    return false;
  }
}

const RUN_STATUS: Record<string, RunStatus> = {
  running: "running",
  passed: "complete",
  failed: "failed",
  error: "failed",
  timed_out: "failed",
  cancelled: "cancelled",
  blocked: "blocked",
};

const PHASE_STATUS: Record<string, PhaseStatus> = {
  passed: "done",
  failed: "failed",
  error: "failed",
  timed_out: "failed",
  // Selected and started, or stopped by the budget before it could: either way it did not finish.
  cancelled: "failed",
  blocked: "blocked",
};

export interface TestPipelineAdapterOptions extends RunReaderOptions {
  runDir: string;
  /** Which trial to render. Defaults to the first that did not pass, else the first. */
  trial?: number;
}

export function runModelFromTestPipeline(options: TestPipelineAdapterOptions): RunModel {
  const runDir = path.resolve(options.runDir);
  const repoRoot = path.resolve(options.repoRoot);
  const linker = options.linker ?? NO_LINKS;
  const warnings: RunWarning[] = [];

  const record = JSON.parse(
    readFileSync(path.join(runDir, PIPELINE_RUN_FILE), "utf8"),
  ) as PipelineRunRecord;

  const index = options.pipelineIndex ?? buildPipelineIndex(repoRoot, options.runtimeArtifacts);
  const assembly = index.assemblies.get(record.pipeline);
  if (!assembly) throw new Error(`no assembled harness for pipeline: ${record.pipeline}`);
  const declared = index.declared.get(record.pipeline) ?? declaredOutputs(repoRoot, assembly);

  const assemblyMatches = assemblyMatchesCurrent(repoRoot, record.pipeline, record.assembly_sha256);
  if (assemblyMatches === false) {
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
  // A run still in its first trial has written its record but no trial yet.
  if (!chosen && record.finished_at !== null) {
    throw new Error(`${PIPELINE_RUN_FILE} carries no trials`);
  }
  const chosenPhases = chosen?.phases ?? [];
  if (options.trial !== undefined && chosen?.trial !== options.trial) {
    warnings.push({
      code: "trial-not-found",
      message: `trial ${options.trial} is not in this record; ${chosen ? `showing trial ${chosen.trial}` : "no trial has finished yet"}`,
    });
  }

  const phaseRecords = new Map(chosenPhases.map((phase) => [phase.phase, phase]));
  const seed = record.seed;
  const seededPhases = new Map(seed?.phases.map((phase) => [phase.phase, phase]));
  if (seed) {
    const drifted = seed.assembly_sha256 !== record.assembly_sha256;
    warnings.push({
      code: "seeded",
      message: `phases before ${seed.from_phase} did not run here; their artifacts were copied from trial ${seed.trial} of run ${seed.run_id} (${seed.run_dir})${drifted ? ", which used a different harness assembly" : ""}`,
      subject: seed.run_id,
    });
  }

  const phases: RunPhase[] = assembly.phases.map((phase) => {
    const ran = phaseRecords.get(phase.phase);
    const seededFrom = seed && phase.phase < seed.from_phase;

    // A phase beyond `--through` was never selected, which is not the same as one that was
    // selected and did not run. One before `--from` ran in the seed run, and only one that passed
    // there carried anything into this one.
    const status: PhaseStatus = ran
      ? (PHASE_STATUS[ran.status] ?? "unknown")
      : seededFrom
        ? seededPhases.get(phase.phase)?.status === "passed"
          ? "done"
          : "skipped"
        : phase.phase > record.through_phase
          ? "skipped"
          : "pending";

    return buildPhaseRow(repoRoot, phase, linker, {
      // A branch runs its legs in order until one leaves nothing unresolved; the last one ran.
      selected: ran?.legs?.at(-1)?.skill ?? null,
      iterations: ran?.iterations?.length ?? null,
      status,
      status_source: seededFrom ? "seed-run" : "run-record",
      feedback_checked: null,
      commits: [],
    });
  });

  for (const phase of chosenPhases) {
    if (phase.status !== "passed") {
      const kind = phase.failure_kind ? ` (${phase.failure_kind})` : "";
      warnings.push({
        code: phase.status === "blocked" ? "phase-blocked" : "phase-failed",
        message: `phase ${phase.phase} (${phase.skill}) ${phase.status}${kind}: ${phase.error ?? "no error recorded"}`,
        subject: phase.skill,
      });
    }
    // A carried artifact such as a ledger is read and written back by the same phase, so its
    // first producer starts without one.
    const writes = new Set((phase.artifacts ?? []).map((artifact) => artifact.id));
    for (const missing of phase.missing_input_ids ?? []) {
      if (writes.has(missing)) continue;
      warnings.push({
        code: "missing-declared-input",
        message: `phase ${phase.phase} (${phase.skill}) declared input '${missing}' that no earlier phase promoted`,
        subject: missing,
      });
    }
  }

  // Each phase, each iteration of a loop phase, and each leg of a branch writes into its own
  // workspace, so the same artifact id can appear more than once across a run. The latest write is
  // the one the run carried forward.
  interface Write {
    phase: number;
    iteration: number | null;
    leg: number | null;
    /** The worker within the phase, for messages: ` iteration 2`, ` leg 1 (find-test-data)`. */
    within: string;
    /** The worker's run directory, which its validator output is relative to; null for a seed. */
    runDir: string | null;
    file: string;
    seeded: boolean;
    result: ArtifactResult;
  }
  const writes = new Map<string, Write[]>();
  // A seed is carried in ahead of every phase this run ran.
  for (const artifact of seed?.artifacts ?? []) {
    writes.set(artifact.id, [
      {
        phase: artifact.producer_phase,
        iteration: null,
        leg: null,
        within: " (seeded)",
        runDir: null,
        file: artifact.path,
        seeded: true,
        result: {
          id: artifact.id,
          path: artifact.path,
          status: "present",
          sha256: artifact.sha256,
        },
      },
    ]);
  }
  for (const phase of chosenPhases) {
    const workers = phase.iterations?.length
      ? phase.iterations.map((iteration) => ({
          ...iteration,
          n: iteration.iteration,
          legN: null,
          within: ` iteration ${iteration.iteration}`,
        }))
      : phase.legs?.length
        ? phase.legs.map((leg) => ({
            ...leg,
            n: null,
            legN: leg.leg,
            within: ` leg ${leg.leg} (${leg.skill})`,
          }))
        : [{ ...phase, n: null, legN: null, within: "" }];
    const several = Boolean(phase.iterations?.length || phase.legs?.length);
    for (const worker of workers) {
      for (const artifact of worker.artifacts ?? []) {
        if (artifact.status === "missing" && several) continue;
        writes.set(artifact.id, [
          ...(writes.get(artifact.id) ?? []),
          {
            phase: phase.phase,
            iteration: worker.n,
            leg: worker.legN,
            within: worker.within,
            runDir: worker.run_dir,
            file: `${worker.run_dir}/workspace/${artifact.path}`,
            seeded: false,
            result: artifact,
          },
        ]);
      }
    }
  }

  const furthest = Math.max(0, ...chosenPhases.map((phase) => phase.phase));

  const artifacts: RunArtifact[] = declared.map((output) => {
    const history = writes.get(output.id) ?? [];
    const hit = history.at(-1);
    const relpath = hit?.file ?? null;
    const absolute = relpath ? path.join(runDir, relpath) : null;
    const entry = absolute ? scanFile(absolute, relpath!) : null;
    const failed = hit?.result.status === "failed" || hit?.result.status === "error";

    // The worker records validator output relative to its own run directory.
    const validator = hit?.result.validator;
    const inPhase = (file: string) => (hit?.runDir ? `${hit.runDir}/${file}` : file);
    if (failed) {
      const exit = validator ? `validator exit ${validator.exit_code ?? "none"}` : "no validator";
      const evidence = validator ? `; see ${inPhase(validator.stderr_path)}` : "";
      warnings.push({
        code: "artifact-failed",
        message: `${output.id} from phase ${hit!.phase}${hit!.within} ${hit!.result.status} (${exit})${evidence}`,
        subject: output.id,
      });
    }
    return toRunArtifact(output, linker, {
      entry,
      presence: failed ? "failed" : resolvePresence(output, entry, furthest),
      written_by_phase: hit?.phase ?? null,
      writes: history.map((write) => ({
        at: null,
        phase: write.phase,
        iteration: write.iteration,
        ...(write.leg === null ? {} : { leg: write.leg }),
        ...(write.seeded ? { seeded: true as const } : {}),
      })),
      variants: [],
      validation:
        validator || failed
          ? {
              validator: validator?.bin ?? null,
              status: hit!.result.status,
              exit_code: validator?.exit_code ?? null,
              stdout: validator ? inPhase(validator.stdout_path) : null,
              stderr: validator ? inPhase(validator.stderr_path) : null,
            }
          : null,
      path: relpath,
      sha256: hit?.result.sha256,
    });
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
      stopped_phase: trial.phases.find((phase) => phase.status !== "passed")?.phase ?? null,
    })),
    selected_trial: chosen?.trial ?? null,
    duration_ms: record.duration_ms,
  };

  const counts = presenceCounts(artifacts);
  const { present, missing, expected, failed: failedArtifacts } = counts;

  // The command rewrites run.json after every trial, so a run that died mid-trial leaves a record
  // with no finish time, or fewer trials than it asked for. Older records carry neither field.
  const requested = record.trials_requested ?? trials.length;
  // A spent budget ends the run with trials still owed; that run did finish.
  const stoppedEarly = record.finished_at !== null && record.status === "cancelled";
  const unfinished = record.finished_at === null || (trials.length < requested && !stoppedEarly);
  if (stoppedEarly && trials.length < requested) {
    warnings.push({
      code: "trials-skipped",
      message: `stopped after ${trials.length} of ${requested} trial(s)`,
    });
  }
  const status = unfinished ? "running" : (RUN_STATUS[record.status] ?? "unknown");
  if (unfinished) {
    warnings.push({
      code: "run-unfinished",
      message: `${trials.length} of ${requested} trial(s) recorded${record.finished_at === null ? " and no finish time" : ""}; the run is still going or was interrupted`,
    });
  }

  const tiles: HealthTile[] = [
    {
      label: "run",
      state:
        status === "complete"
          ? "ok"
          : status === "running" || status === "blocked"
            ? "warn"
            : "error",
      value: record.status,
      detail: chosen
        ? `trial ${chosen.trial} of ${requested}`
        : `no trial finished of ${requested}`,
      anchor: "#phases",
    },
    phasesTile(
      phases,
      seed
        ? `evaluated phases ${seed.from_phase} to ${record.through_phase}`
        : `evaluated through phase ${record.through_phase}`,
    ),
    {
      label: "artifacts",
      state: missing || failedArtifacts ? "error" : "ok",
      value: `${present}/${expected}`,
      detail:
        [
          missing ? `${missing} declared artifact(s) not produced` : "",
          failedArtifacts ? `${failedArtifacts} failed their check` : "",
        ]
          .filter(Boolean)
          .join("; ") || "every declared artifact was produced",
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
    ...modelHeader(options),
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
      foundry_head: typeof record.foundry_head === "string" ? record.foundry_head : null,
      options_observed: [
        ...(chosen ? [`trial-${chosen.trial}`] : []),
        record.sandbox?.mode ?? "unknown",
      ],
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
    health: healthRollup(tiles, {
      phases,
      furthest,
      counts,
      filesAttributed: present,
      filesSeen: present,
    }),
    warnings,
  };
}
