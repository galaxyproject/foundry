// Reads `foundry-run.yml`, the harness's own account of the run.
//
// Every field is treated as optional and every value is narrowed rather than trusted. The record
// is written by an agent over the course of a long run, so a half-written phase row is an ordinary
// outcome, not a corrupt file. A reader that threw on the first surprise would be useless exactly
// when the run went badly, which is when it is most wanted.

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import yaml from "js-yaml";

import type { PhaseStatus, RunStatus, RunWarning } from "./run-model.js";

export const RUN_RECORD_FILENAME = "foundry-run.yml";

export interface RecordedArtifact {
  id: string;
  file: string | null;
  at: string | null;
  iteration: number | null;
}

export interface RecordedPhase {
  n: number;
  kind: string;
  skill: string | null;
  pattern: string | null;
  selected: string | null;
  status: PhaseStatus;
  iterations: number | null;
  artifacts: RecordedArtifact[];
}

export interface RunRecord {
  run_record_version: number;
  pipeline: string | null;
  run_slug: string | null;
  source_revision: number | null;
  harness_name: string | null;
  assembly_sha256: string | null;
  foundry_head: string | null;
  started_at: string | null;
  finished_at: string | null;
  status: RunStatus;
  phases: RecordedPhase[];
}

export interface RunRecordLoad {
  record: RunRecord | null;
  path: string | null;
  warnings: RunWarning[];
}

const PHASE_STATUSES = new Set<PhaseStatus>([
  "pending",
  "running",
  "done",
  "failed",
  "skipped",
  "unknown",
]);
const RUN_STATUSES = new Set<RunStatus>(["running", "complete", "failed", "cancelled", "unknown"]);

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/**
 * An identifier that YAML may have resolved to a number.
 *
 * A sha or a commit id is hex, and an all-digit one is a legal hex string that unquoted YAML turns
 * into a number. Reading it back as a string keeps such a record usable instead of silently
 * dropping the only field that pins the run to a Foundry revision.
 */
function asToken(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return asString(value);
}

/** Dates arrive as ISO strings or, when js-yaml resolves a timestamp, as a Date. */
function asInstant(value: unknown): string | null {
  if (value instanceof Date) return value.toISOString();
  return asString(value);
}

function asPhaseStatus(value: unknown): PhaseStatus {
  const text = asString(value);
  return text && PHASE_STATUSES.has(text as PhaseStatus) ? (text as PhaseStatus) : "unknown";
}

function asRunStatus(value: unknown): RunStatus {
  const text = asString(value);
  return text && RUN_STATUSES.has(text as RunStatus) ? (text as RunStatus) : "unknown";
}

function readArtifacts(value: unknown, warnings: RunWarning[], phase: number): RecordedArtifact[] {
  if (!Array.isArray(value)) return [];
  const out: RecordedArtifact[] = [];
  for (const raw of value) {
    const row = asRecord(raw);
    const id = row ? asString(row.id) : null;
    if (!id) {
      warnings.push({
        code: "run-record-artifact-unnamed",
        message: `phase ${phase} records an artifact with no id`,
        subject: RUN_RECORD_FILENAME,
      });
      continue;
    }
    out.push({
      id,
      file: asString(row!.file),
      at: asInstant(row!.at),
      iteration: asNumber(row!.iteration),
    });
  }
  return out;
}

export function parseRunRecord(text: string, from: string): RunRecordLoad {
  const warnings: RunWarning[] = [];
  let parsed: unknown;
  try {
    parsed = yaml.load(text);
  } catch (error) {
    return {
      record: null,
      path: from,
      warnings: [
        {
          code: "run-record-unparseable",
          message: `${RUN_RECORD_FILENAME} is not valid YAML: ${(error as Error).message}`,
          subject: from,
        },
      ],
    };
  }

  const root = asRecord(parsed);
  if (!root) {
    return {
      record: null,
      path: from,
      warnings: [
        {
          code: "run-record-not-a-mapping",
          message: `${RUN_RECORD_FILENAME} is not a mapping`,
          subject: from,
        },
      ],
    };
  }

  const version = asNumber(root.run_record_version) ?? 1;
  if (version !== 1) {
    warnings.push({
      code: "run-record-version-unknown",
      message: `${RUN_RECORD_FILENAME} declares run_record_version ${version}; reading it as version 1`,
      subject: from,
    });
  }

  const phases: RecordedPhase[] = [];
  if (Array.isArray(root.phases)) {
    for (const raw of root.phases) {
      const row = asRecord(raw);
      if (!row) continue;
      const n = asNumber(row.n);
      if (n === null) {
        warnings.push({
          code: "run-record-phase-unnumbered",
          message: `${RUN_RECORD_FILENAME} has a phase row with no 'n'`,
          subject: from,
        });
        continue;
      }
      phases.push({
        n,
        kind: asString(row.kind) ?? "mold",
        skill: asString(row.skill),
        pattern: asString(row.pattern),
        selected: asString(row.selected),
        status: asPhaseStatus(row.status),
        iterations: asNumber(row.iterations),
        artifacts: readArtifacts(row.artifacts, warnings, n),
      });
    }
  } else {
    warnings.push({
      code: "run-record-no-phases",
      message: `${RUN_RECORD_FILENAME} carries no phase roster`,
      subject: from,
    });
  }

  return {
    record: {
      run_record_version: 1,
      pipeline: asString(root.pipeline),
      run_slug: asString(root.run_slug),
      source_revision: asNumber(root.source_revision),
      harness_name: asString(root.harness_name),
      assembly_sha256: asToken(root.assembly_sha256),
      foundry_head: asToken(root.foundry_head),
      started_at: asInstant(root.started_at),
      finished_at: asInstant(root.finished_at),
      status: asRunStatus(root.status),
      phases: phases.sort((a, b) => a.n - b.n),
    },
    path: from,
    warnings,
  };
}

export function readRunRecord(runDir: string): RunRecordLoad {
  const file = path.join(runDir, RUN_RECORD_FILENAME);
  if (!existsSync(file)) return { record: null, path: null, warnings: [] };
  return parseRunRecord(readFileSync(file, "utf8"), RUN_RECORD_FILENAME);
}
