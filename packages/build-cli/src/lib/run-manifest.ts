// Builds one normalized `RunModel` from a run directory.
//
// Three sources, in descending order of trust: the harness's own run record, the checkpoint git
// history, and the filesystem. They can disagree — on the one real checkpointed run available
// while this was written, the feedback ledger said a phase was still running while the git log
// showed it committed — so disagreement is reported as a warning rather than resolved silently.

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

import type { RuntimeArtifactRegistry } from "@galaxy-foundry/gxwf-foundry-note-schema";

import { declaredOutputs, type DeclaredOutput } from "./cast-registry.js";
import { assemblyPath, loadSkillProvenance, phaseSkills } from "./cast-registry.js";
import { classifyEntries } from "./run-classify.js";
import {
  FEEDBACK_LEDGER_FILENAME,
  readFeedbackLedger,
  readOpenRequirements,
} from "./run-ledgers.js";
import { readRunTimeline, type GitExec } from "./run-git.js";
import {
  RUN_MANIFEST_SCHEMA_VERSION,
  worstState,
  type ArtifactPresence,
  type HealthState,
  type HealthTile,
  type PhaseStatus,
  type PhaseStatusSource,
  type RunArtifact,
  type RunModel,
  type RunPhase,
  type RunStatus,
  type RunWarning,
  type UnmappedFile,
} from "./run-model.js";
import {
  asRunStatus,
  assemblyMatchesCheckout,
  readRunRecord,
  RUN_RECORD_FILENAME,
  type RunRecord,
} from "./run-record.js";
import { derivePreview, unmappedPreview } from "./run-preview.js";
import { scanRunDir, type ScanOptions, type ScannedEntry } from "./run-scan.js";
import {
  buildPipelineIndex,
  detectPipeline,
  type PipelineDetection,
  type PipelineIndex,
} from "./run-reconstruct.js";

export interface SiteLinker {
  artifact(id: string): string | null;
  mold(slug: string): string | null;
  pipeline(slug: string): string | null;
  harness(slug: string): string | null;
  schema(wikiLink: string): string | null;
  note(locator: string): string | null;
}

export interface BuildRunModelOptions {
  runDir: string;
  repoRoot: string;
  pipeline?: string;
  /** Allow a run with no `foundry-run.yml`, reading it degraded and labelled. */
  reconstruct?: boolean;
  runtimeArtifacts?: RuntimeArtifactRegistry;
  pipelineIndex?: PipelineIndex;
  linker?: SiteLinker;
  scan?: Partial<ScanOptions>;
  gitExec?: GitExec;
  now?: () => Date;
  packageVersion?: string;
  foundryHead?: string | null;
}

export class RunRecordMissingError extends Error {
  constructor(runDir: string, filename = RUN_RECORD_FILENAME) {
    super(
      `no ${filename} in ${runDir}. This run predates the run record, so its pipeline, phase order, loop counts and branch choices are not on disk. Pass --reconstruct to read it degraded, optionally with --pipeline <slug>.`,
    );
    this.name = "RunRecordMissingError";
  }
}

/** A record is on disk but cannot be parsed — most often one a crashed run left half-written. */
export class RunRecordUnreadableError extends RunRecordMissingError {
  constructor(runDir: string, reason: string) {
    super(runDir);
    this.message = `${reason} (in ${runDir}). Repair it, or pass --reconstruct to read the run degraded, optionally with --pipeline <slug>.`;
    this.name = "RunRecordUnreadableError";
  }
}

const NO_LINKS: SiteLinker = {
  artifact: () => null,
  mold: () => null,
  pipeline: () => null,
  harness: () => null,
  schema: () => null,
  note: () => null,
};

function sha256Text(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

/** Artifacts worth a per-commit size series: the ones a loop grows. */
const TRACKED_FOR_GROWTH = new Set(["galaxy-workflow-draft", "galaxy-workflow"]);

function phaseStatusFromCommits(
  phase: number,
  commitPhases: Set<number>,
  furthest: number,
): PhaseStatus {
  if (commitPhases.has(phase)) return "done";
  return phase <= furthest ? "unknown" : "pending";
}

export function buildRunModel(options: BuildRunModelOptions): RunModel {
  const runDir = path.resolve(options.runDir);
  const repoRoot = path.resolve(options.repoRoot);
  const now = options.now ?? (() => new Date());
  const linker = options.linker ?? NO_LINKS;
  const warnings: RunWarning[] = [];

  if (!existsSync(runDir)) throw new Error(`run directory not found: ${runDir}`);

  // ---- sources ------------------------------------------------------------------------------

  const registered = (id: string): string | undefined =>
    options.runtimeArtifacts?.artifacts.get(id)?.default_filename;
  const recordFilename = registered("foundry-run-manifest") ?? RUN_RECORD_FILENAME;
  const ledgerFilename = registered("foundry-feedback-ledger") ?? FEEDBACK_LEDGER_FILENAME;

  const recordLoad = readRunRecord(runDir, recordFilename);
  warnings.push(...recordLoad.warnings);
  const record: RunRecord | null = recordLoad.record;
  if (!record && !options.reconstruct) {
    // A record that exists and cannot be read is not a run that predates the record; saying so
    // would hide the one failure most worth seeing.
    if (recordLoad.path !== null) {
      throw new RunRecordUnreadableError(
        runDir,
        recordLoad.warnings[0]?.message ?? `${recordFilename} cannot be read`,
      );
    }
    throw new RunRecordMissingError(runDir, recordFilename);
  }
  if (record && !record.pipeline) {
    warnings.push({
      code: "run-record-no-pipeline",
      message: `${recordFilename} names no pipeline, so the pipeline below was worked out from the files`,
      subject: recordFilename,
    });
  }

  const scan = scanRunDir(runDir, options.scan);
  const feedbackLoad = readFeedbackLedger(runDir, ledgerFilename);
  const feedback = feedbackLoad.ledger;
  const ledgerPhases = feedbackLoad.phases;
  const openRequirementsLoad = readOpenRequirements(runDir);
  const openRequirements = openRequirementsLoad.ledger;
  warnings.push(...feedbackLoad.warnings, ...openRequirementsLoad.warnings);

  const index = options.pipelineIndex ?? buildPipelineIndex(repoRoot, options.runtimeArtifacts);
  const observed = scan.entries.filter((e) => e.type === "file").map((e) => e.basename);
  const detection: PipelineDetection = detectPipeline(observed, index, {
    recordPipeline: record?.pipeline,
    ledgerPipeline: feedback?.run.pipeline,
    flagPipeline: options.pipeline,
  });
  warnings.push(...detection.warnings);
  if (detection.conflict) {
    warnings.push({
      code: "pipeline-conflict",
      message: detection.conflict.note,
      subject: detection.pipeline,
    });
  }

  const assembly = index.assemblies.get(detection.pipeline);
  if (!assembly) throw new Error(`no assembled harness for pipeline: ${detection.pipeline}`);
  const declared = index.declared.get(detection.pipeline) ?? declaredOutputs(repoRoot, assembly);

  // ---- assembly identity --------------------------------------------------------------------

  const assemblyFile = assemblyPath(repoRoot, detection.pipeline);
  const currentAssemblySha = existsSync(assemblyFile)
    ? sha256Text(readFileSync(assemblyFile, "utf8"))
    : null;
  const assemblyMatches = assemblyMatchesCheckout(record?.assembly_sha256, currentAssemblySha);
  if (assemblyMatches === false) {
    warnings.push({
      code: "assembly-drifted",
      message:
        "the committed harness has changed since this run read it, so phase numbers and declared artifacts below describe today's pipeline rather than the one that ran",
      subject: detection.pipeline,
    });
  }

  // ---- timeline -----------------------------------------------------------------------------

  const tracked = declared
    .filter((output) => TRACKED_FOR_GROWTH.has(output.id))
    .map((output) => ({ artifact_id: output.id, filename: output.default_filename }));
  const timeline = readRunTimeline(runDir, { exec: options.gitExec, tracked });

  const commitPhases = new Set<number>();
  const commitsByPhase = new Map<number, string[]>();
  for (const commit of timeline?.commits ?? []) {
    if (commit.phase === null) continue;
    commitPhases.add(commit.phase);
    const list = commitsByPhase.get(commit.phase) ?? [];
    list.push(commit.sha);
    commitsByPhase.set(commit.phase, list);
  }

  // ---- phases -------------------------------------------------------------------------------

  const recordedPhases = new Map(record?.phases.map((phase) => [phase.n, phase]) ?? []);
  const ledgerByPhase = new Map(ledgerPhases.map((row) => [row.n, row]));

  const reached = (status: PhaseStatus | null): boolean =>
    status !== null && status !== "pending" && status !== "unknown";
  const furthestRecorded = Math.max(
    0,
    ...[...recordedPhases.values()]
      .filter((phase) => reached(phase.status))
      .map((phase) => phase.n),
    ...ledgerPhases.filter((row) => reached(row.status)).map((row) => row.n),
    ...commitPhases,
  );

  const roster = new Set(assembly.phases.map((phase) => phase.phase));
  for (const phase of record?.phases ?? []) {
    if (roster.has(phase.n)) continue;
    warnings.push({
      code: "run-record-phase-not-in-roster",
      message: `${recordFilename} records phase ${phase.n}, which ${detection.pipeline} does not have`,
      subject: String(phase.n),
    });
  }

  // Classification runs before the phase loop because a run with no record, no ledger and no
  // checkpoint history has only one source left for "did this phase run": whether its declared
  // outputs are on disk.
  const classification = classifyEntries(
    scan.entries,
    declared,
    index.filenameOwners,
    index.skillOwners,
  );

  /**
   * Outputs only one phase of this pipeline declares.
   *
   * A shared output carries no phase information — `open-requirements.ledger.yml` is declared by
   * most phases, so its presence would mark every one of them done. Only an exclusive output says
   * anything about which phase ran.
   */
  const exclusiveOutputs = new Map<number, string[]>();
  for (const output of declared) {
    if (output.producing_phases.length !== 1) continue;
    const phase = output.producing_phases[0]!;
    const list = exclusiveOutputs.get(phase) ?? [];
    list.push(output.id);
    exclusiveOutputs.set(phase, list);
  }

  function inferredFromArtifacts(phase: number): {
    status: PhaseStatus;
    source: PhaseStatusSource;
  } {
    const exclusive = exclusiveOutputs.get(phase) ?? [];
    if (!exclusive.length) return { status: "unknown", source: "unknown" };
    const present = exclusive.filter((id) => classification.declared.has(id)).length;
    if (present === exclusive.length) return { status: "done", source: "artifact-presence" };
    if (present === 0) return { status: "pending", source: "artifact-presence" };
    return { status: "unknown", source: "unknown" };
  }

  const phases: RunPhase[] = assembly.phases.map((phase) => {
    const recorded = recordedPhases.get(phase.phase);
    const ledger = ledgerByPhase.get(phase.phase);

    // Four sources, in descending order of what they actually witnessed. The chosen one is
    // recorded beside the status so the page can say how much weight it carries.
    const resolved: { status: PhaseStatus; source: PhaseStatusSource } = recorded
      ? { status: recorded.status, source: "run-record" }
      : ledger?.status
        ? { status: ledger.status, source: "feedback-ledger" }
        : timeline
          ? {
              status: phaseStatusFromCommits(phase.phase, commitPhases, furthestRecorded),
              source: "git",
            }
          : inferredFromArtifacts(phase.phase);
    const { status, source } = resolved;

    // The sources can disagree, and each disagreement is reported rather than settled silently:
    // the record is preferred, but a reader should see that something else said otherwise.
    if (
      recorded &&
      timeline &&
      (recorded.status === "running" || recorded.status === "pending") &&
      commitPhases.has(phase.phase)
    ) {
      warnings.push({
        code: "phase-status-disagreement",
        message: `phase ${phase.phase} is '${recorded.status}' in ${recordFilename} but has a checkpoint commit`,
        subject: String(phase.phase),
      });
    }
    if (recorded && ledger?.status && ledger.status !== recorded.status) {
      warnings.push({
        code: "phase-status-sources-disagree",
        message: `phase ${phase.phase} is '${recorded.status}' in ${recordFilename} but '${ledger.status}' in ${ledgerFilename}`,
        subject: String(phase.phase),
      });
    }
    const assembled = phase.skill ?? phase.pattern ?? null;
    const claimed = recorded?.skill ?? recorded?.pattern ?? null;
    if (assembled && claimed && assembled !== claimed) {
      warnings.push({
        code: "run-record-skill-mismatch",
        message: `phase ${phase.phase} is ${claimed} in ${recordFilename} but ${assembled} in today's assembly`,
        subject: String(phase.phase),
      });
    }

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

    const skill = phase.skill ?? null;
    const moldProvenance = skill ? loadSkillProvenance(repoRoot, skill) : null;
    const mold = moldProvenance?.mold;

    return {
      n: phase.phase,
      kind: phase.kind,
      skill,
      pattern: phase.pattern ?? null,
      chain: Array.isArray(phase.chain) ? phase.chain : [],
      selected: recorded?.selected ?? ledger?.selected ?? null,
      loop: phase.loop === true,
      iterations: recorded?.iterations ?? ledger?.iterations ?? null,
      status,
      status_source: source,
      feedback_checked: ledger?.feedback_checked ?? null,
      produces: [...produces].sort(),
      consumes: [...consumes].sort(),
      mold:
        mold && mold.path && typeof mold.revision === "number"
          ? {
              path: mold.path,
              revision: mold.revision,
              content_hash: mold.content_hash ?? "",
            }
          : null,
      site_href: skill ? linker.mold(skill) : null,
      commits: commitsByPhase.get(phase.phase) ?? [],
    };
  });

  // ---- artifacts ----------------------------------------------------------------------------

  // How far the run got. A record or a checkpoint history says so directly. A reconstructed run
  // says nothing, so the files themselves are the only evidence: the latest phase whose declared
  // output is on disk is the latest phase that demonstrably ran.
  const furthestByArtifact = Math.max(
    0,
    ...declared
      .filter((output) => classification.declared.has(output.id) && output.producing_phases.length)
      // The earliest declaring phase, not the latest: a file's presence proves its first producer
      // ran, and proves nothing about a later phase that would have rewritten the same name.
      .map((output) => Math.min(...output.producing_phases)),
  );
  const furthest = Math.max(
    0,
    ...phases
      .filter((phase) => phase.status !== "pending" && phase.status !== "unknown")
      .map((phase) => phase.n),
    furthestRecorded,
    furthestByArtifact,
  );
  const variantsById = new Map<string, typeof classification.variants>();
  for (const variant of classification.variants) {
    const list = variantsById.get(variant.parentArtifactId) ?? [];
    list.push(variant);
    variantsById.set(variant.parentArtifactId, list);
  }

  const declaredIds = new Set(declared.map((output) => output.id));
  const writesById = new Map<string, RunArtifact["writes"]>();
  for (const phase of record?.phases ?? []) {
    for (const written of phase.artifacts) {
      if (!declaredIds.has(written.id) && !writesById.has(written.id)) {
        warnings.push({
          code: "run-record-artifact-undeclared",
          message: `phase ${phase.n} records writing '${written.id}', which no phase of ${detection.pipeline} declares`,
          subject: written.id,
        });
      }
      const list = writesById.get(written.id) ?? [];
      list.push({ at: written.at, phase: phase.n, iteration: written.iteration });
      writesById.set(written.id, list);
    }
  }

  const artifacts: RunArtifact[] = declared.map((output) => {
    const entry = classification.declared.get(output.id) ?? null;
    const writes = writesById.get(output.id) ?? [];
    const presence = resolvePresence(output, entry, furthest);
    const variants = (variantsById.get(output.id) ?? []).map((variant) => ({
      basename: variant.entry.basename,
      suffix: variant.suffix,
      size_bytes: variant.entry.size_bytes,
      mtime: variant.entry.mtime,
      sha256: variant.entry.sha256,
      bytes_delta: entry ? variant.entry.size_bytes - entry.size_bytes : null,
    }));

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
      written_by_phase: writes.length ? writes[writes.length - 1]!.phase : null,
      presence,
      path: entry ? entry.relpath : null,
      size_bytes: entry?.size_bytes ?? null,
      mtime: entry?.mtime ?? null,
      sha256: entry?.sha256 ?? null,
      hash_skipped_reason: entry?.hash_skipped_reason ?? null,
      variants,
      writes,
      preview: entry ? derivePreview(output.id, output.kind, entry) : null,
      validation: null,
      site_href: linker.artifact(output.id),
    };
  });

  const unmapped: UnmappedFile[] = classification.unmapped.map((item) => ({
    relpath: item.entry.relpath,
    class: item.cls,
    size_bytes: item.entry.size_bytes,
    mtime: item.entry.mtime,
    sha256: item.entry.sha256,
    attached_to: item.attachedTo,
    declared_by_pipelines: item.declaredByPipelines,
    declared_by_skills: item.declaredBySkills,
    dir_summary: item.entry.dir_summary,
    preview:
      item.cls === "narrative" || item.cls === "tool-output" ? unmappedPreview(item.entry) : null,
  }));

  for (const item of classification.unmapped) {
    if (item.cls !== "cross-pipeline") continue;
    warnings.push({
      code: "cross-pipeline-file",
      message: `${item.entry.basename} is declared by ${item.declaredByPipelines.join(", ")} but not by ${detection.pipeline}`,
      subject: item.entry.basename,
    });
  }

  // ---- ledgers, linked back to phases -------------------------------------------------------

  const phaseBySkill = new Map<string, number>();
  for (const phase of assembly.phases) {
    for (const skill of phaseSkills(phase)) {
      if (!phaseBySkill.has(skill)) phaseBySkill.set(skill, phase.phase);
    }
  }

  if (openRequirements) {
    for (const entry of openRequirements.entries) {
      entry.raised_by_phase = entry.raised_by ? (phaseBySkill.get(entry.raised_by) ?? null) : null;
      entry.resolved_by_phase = entry.resolved_by
        ? (phaseBySkill.get(entry.resolved_by) ?? null)
        : null;
      entry.raised_by_href = entry.raised_by ? linker.mold(entry.raised_by) : null;
      entry.resolved_by_href = entry.resolved_by ? linker.mold(entry.resolved_by) : null;
    }
  }

  if (feedback) {
    for (const entry of feedback.entries) {
      entry.raised_by_phase = entry.raised_by ? (phaseBySkill.get(entry.raised_by) ?? null) : null;
      entry.subject_href = entry.subject_locator
        ? linker.note(entry.subject_locator)
        : entry.subject_label && entry.subject_kind === "mold"
          ? linker.mold(entry.subject_label)
          : null;
    }
  }

  // ---- rollup -------------------------------------------------------------------------------

  const expected = artifacts.filter((artifact) => artifact.presence !== "not-yet-due").length;
  const present = artifacts.filter((artifact) => artifact.presence === "present").length;
  const missing = artifacts.filter((artifact) => artifact.presence === "missing").length;
  const filesSeen = scan.entries.filter((entry) => entry.type === "file").length;
  const filesAttributed = classification.declared.size + classification.variants.length;

  const status: RunStatus = record?.status ?? asRunStatus(feedback?.run.status);

  const options_observed: string[] = [];
  if (timeline) options_observed.push("checkpoint");
  if (feedback) options_observed.push("feedback");

  const health = buildHealth({
    status,
    phases,
    furthest,
    present,
    expected,
    missing,
    openRequirements,
    feedback,
    unmapped,
    filesAttributed,
    filesSeen,
  });

  const started =
    record?.started_at ??
    (timeline ? (timeline.commits[timeline.commits.length - 1]?.date ?? null) : null) ??
    minMtime(scan.entries);
  // A record with no `finished_at` is a run that has not finished; only a run with no record at
  // all borrows the newest commit or file time.
  const finished = record
    ? record.finished_at
    : ((timeline ? (timeline.commits[0]?.date ?? null) : null) ?? maxMtime(scan.entries));

  return {
    run_manifest_schema_version: RUN_MANIFEST_SCHEMA_VERSION,
    generated_at: now().toISOString(),
    generator: {
      command: "run-dashboard",
      foundry_head: options.foundryHead ?? null,
      package_version: options.packageVersion ?? "0.0.0",
    },
    run: {
      shape: "harness",
      provenance: record ? "recorded" : "reconstructed",
      slug: record?.run_slug ?? feedback?.run.run_slug ?? path.basename(runDir),
      dir: runDir,
      pipeline: detection.pipeline,
      pipeline_source_revision: record?.source_revision ?? assembly.source_revision,
      harness_name: record?.harness_name ?? assembly.harness_name,
      assembly_sha256: record?.assembly_sha256 ?? null,
      assembly_matches_checkout: assemblyMatches,
      foundry_head: record?.foundry_head ?? null,
      options_observed,
      status,
      started_at: started,
      finished_at: finished,
      total_bytes: scan.total_bytes,
    },
    phases,
    artifacts,
    unmapped,
    ignored_count: scan.ignored_count,
    open_requirements: openRequirements,
    feedback,
    timeline,
    evaluation: null,
    health,
    warnings,
  };
}

function resolvePresence(
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

function abbreviateHome(dir: string, home: string): string {
  if (!home || !path.isAbsolute(dir)) return dir;
  const relative = path.relative(home, dir);
  if (relative.startsWith("..") || path.isAbsolute(relative)) return dir;
  return relative ? `~/${relative.split(path.sep).join("/")}` : "~";
}

function minMtime(entries: ScannedEntry[]): string | null {
  const times = entries.map((entry) => entry.mtime).sort();
  return times[0] ?? null;
}

function maxMtime(entries: ScannedEntry[]): string | null {
  const times = entries.map((entry) => entry.mtime).sort();
  return times[times.length - 1] ?? null;
}

function buildHealth(input: {
  status: RunStatus;
  phases: RunPhase[];
  furthest: number;
  present: number;
  expected: number;
  missing: number;
  openRequirements: RunModel["open_requirements"];
  feedback: RunModel["feedback"];
  unmapped: UnmappedFile[];
  filesAttributed: number;
  filesSeen: number;
}): RunModel["health"] {
  const failedPhases = input.phases.filter((phase) => phase.status === "failed").length;
  const done = input.phases.filter((phase) => phase.status === "done").length;

  const runState: HealthState =
    input.status === "complete"
      ? "ok"
      : input.status === "failed" || input.status === "cancelled"
        ? "error"
        : "warn";

  const artifactState: HealthState = input.missing > 0 ? "error" : "ok";
  const phaseState: HealthState =
    failedPhases > 0 ? "error" : done === input.phases.length ? "ok" : "warn";

  const obligationsUnreadable = input.openRequirements?.unreadable ?? null;
  const obligations = obligationsUnreadable ? undefined : input.openRequirements?.counts;
  const obligationState: HealthState = obligationsUnreadable
    ? "warn"
    : obligations
      ? obligations.blocking_open > 0 || obligations.surrendered > 0
        ? "warn"
        : obligations.open > 0
          ? "warn"
          : "ok"
      : "ok";

  const feedbackUnreadable = input.feedback?.unreadable ?? null;
  const blockers = input.feedback?.counts.by_severity.blocker ?? 0;
  const feedbackState: HealthState = blockers > 0 ? "error" : input.feedback ? "warn" : "ok";

  const unmappedBytes = input.unmapped.reduce((sum, item) => sum + item.size_bytes, 0);

  const tiles: HealthTile[] = [
    {
      label: "run",
      state: runState,
      value: input.status,
      detail:
        input.status === "complete"
          ? "every intended phase finished"
          : `the record last said ${input.status}`,
      anchor: "#phases",
    },
    {
      label: "phases",
      state: phaseState,
      value: `${done}/${input.phases.length}`,
      detail: failedPhases
        ? `${failedPhases} failed; furthest reached was phase ${input.furthest}`
        : `furthest reached was phase ${input.furthest}`,
      anchor: "#phases",
    },
    {
      label: "artifacts",
      state: artifactState,
      value: `${input.present}/${input.expected}`,
      detail: input.missing
        ? `${input.missing} declared artifact(s) due but absent`
        : "every artifact due so far is on disk",
      anchor: "#artifacts",
    },
    {
      label: "obligations",
      state: obligationState,
      value: obligationsUnreadable
        ? "unreadable"
        : obligations
          ? `${obligations.open} open`
          : "none",
      detail: obligationsUnreadable
        ? `the open-requirements ledger is ${obligationsUnreadable}`
        : obligations
          ? `${obligations.resolved} resolved, ${obligations.surrendered} surrendered, ${obligations.blocking_open} blocking`
          : "no open-requirements ledger in this run",
      anchor: "#obligations",
    },
    {
      label: "feedback",
      state: feedbackState,
      value: feedbackUnreadable
        ? "unreadable"
        : input.feedback
          ? String(input.feedback.counts.total)
          : "off",
      detail: feedbackUnreadable
        ? `the feedback ledger is ${feedbackUnreadable}`
        : input.feedback
          ? `${blockers} blocker, ${input.feedback.counts.by_severity.major ?? 0} major, ${input.feedback.counts.by_severity.minor ?? 0} minor`
          : "the run was not invoked with feedback mode",
      anchor: "#feedback",
    },
    {
      label: "unmapped",
      state: "ok",
      value: String(input.unmapped.length),
      detail: `${(unmappedBytes / (1024 * 1024)).toFixed(1)} MB no Mold declares`,
      anchor: "#unmapped",
    },
  ];

  return {
    overall: worstState(tiles.map((tile) => tile.state)),
    tiles,
    furthest_phase: input.furthest,
    total_phases: input.phases.length,
    artifacts_present: input.present,
    artifacts_expected: input.expected,
    artifacts_missing: input.missing,
    files_attributed: input.filesAttributed,
    files_seen: input.filesSeen,
  };
}

/**
 * The manifest as written to disk: the model, minus embedded artifact bodies.
 *
 * The page needs the bytes in order to show them. The manifest does not — every body it carried
 * would be a second copy of a file sitting in the same directory, and on a real run that doubles
 * the output for nothing. Metadata, derived views and skip reasons stay, so the manifest still
 * answers what an artifact is and why it was not shown. The run directory is abbreviated under the
 * home directory, because the manifest is meant to be shared and a home path names its owner.
 */
export function serializeRunManifest(model: RunModel, home = homedir()): string {
  const slim = JSON.parse(JSON.stringify(model)) as RunModel;
  slim.run.dir = abbreviateHome(slim.run.dir, home);
  for (const artifact of slim.artifacts) {
    if (artifact.preview) {
      artifact.preview.body = null;
      artifact.preview.outline = null;
    }
  }
  for (const file of slim.unmapped) {
    if (file.preview) {
      file.preview.body = null;
      file.preview.outline = null;
    }
  }
  return `${JSON.stringify(slim, null, 2)}\n`;
}
