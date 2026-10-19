// Reads `foundry-run.yml`, the harness's own account of the run.
//
// Every field is treated as optional and every value is narrowed rather than trusted. The record
// is written by an agent over the course of a long run, so a half-written phase row is an ordinary
// outcome, not a corrupt file. A reader that threw on the first surprise would be useless exactly
// when the run went badly, which is when it is most wanted.

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import yaml from "js-yaml";

import { assemblyPath } from "./cast-registry.js";
import { asNumber, asRecord, asString } from "./narrow.js";
import { sha256File } from "./reconcile.js";
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
  "blocked",
  "skipped",
  "unknown",
]);
const RUN_STATUSES = new Set<RunStatus>([
  "running",
  "complete",
  "failed",
  "cancelled",
  "blocked",
  "unknown",
]);

/**
 * An identifier that YAML may have resolved to a number.
 *
 * A sha or a commit id is hex, and an all-digit one is a legal hex string that unquoted YAML turns
 * into a number — dropping leading zeros, or reading `12e45` as an exponent. Its digits cannot be
 * trusted to be the ones written, so it is reported and read as absent rather than compared.
 */
function asToken(
  value: unknown,
  field: string,
  from: string,
  warnings: RunWarning[],
): string | null {
  if (typeof value === "number") {
    warnings.push({
      code: "run-record-token-not-quoted",
      message: `${field} arrived as a YAML number, so its digits may not be the ones written; it is ignored until quoted`,
      subject: from,
    });
    return null;
  }
  return asString(value);
}

/** Dates arrive as ISO strings or, when js-yaml resolves a timestamp, as a Date. */
function asInstant(value: unknown): string | null {
  if (value instanceof Date) return value.toISOString();
  return asString(value);
}

/** A phase number, which a hand-edited roster sometimes quotes. */
export function asPhaseNumber(value: unknown): number | null {
  if (typeof value === "string" && /^\d+$/.test(value.trim())) return Number(value);
  return asNumber(value);
}

export function asPhaseStatus(value: unknown): PhaseStatus {
  const text = asString(value);
  return text && PHASE_STATUSES.has(text as PhaseStatus) ? (text as PhaseStatus) : "unknown";
}

export function asRunStatus(value: unknown): RunStatus {
  const text = asString(value);
  return text && RUN_STATUSES.has(text as RunStatus) ? (text as RunStatus) : "unknown";
}

/**
 * Whether a run read the assembly the checkout holds now. Recorded shas arrive in whatever case
 * and prefix the writer chose; no recorded sha says nothing about drift, so it is null.
 */
export function assemblyMatchesCheckout(
  recorded: string | null | undefined,
  current: string | null,
): boolean | null {
  if (!recorded || current === null) return null;
  const normalized = recorded
    .trim()
    .toLowerCase()
    .replace(/^sha256:/, "");
  return normalized === current;
}

/** `assemblyMatchesCheckout` against the pipeline's `_assembly.json` as it is on disk now. */
export function assemblyMatchesCurrent(
  repoRoot: string,
  pipeline: string,
  recorded: string | null | undefined,
): boolean | null {
  const file = assemblyPath(repoRoot, pipeline);
  // Bytes, the way `test-pipeline` records the digest and the harness is told to.
  return assemblyMatchesCheckout(recorded, existsSync(file) ? sha256File(file) : null);
}

function readArtifacts(
  value: unknown,
  warnings: RunWarning[],
  phase: number,
  from: string,
): RecordedArtifact[] {
  if (!Array.isArray(value)) return [];
  const out: RecordedArtifact[] = [];
  for (const raw of value) {
    const row = asRecord(raw);
    const id = row ? asString(row.id) : null;
    if (!id) {
      warnings.push({
        code: "run-record-artifact-unnamed",
        message: `phase ${phase} records an artifact with no id`,
        subject: from,
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
          message: `${from} is not valid YAML: ${(error as Error).message}`,
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
          message: `${from} is not a mapping`,
          subject: from,
        },
      ],
    };
  }

  const version = asNumber(root.run_record_version) ?? 1;
  if (version !== 1) {
    warnings.push({
      code: "run-record-version-unknown",
      message: `${from} declares run_record_version ${version}; reading it as version 1`,
      subject: from,
    });
  }

  const phases: RecordedPhase[] = [];
  if (Array.isArray(root.phases)) {
    for (const raw of root.phases) {
      const row = asRecord(raw);
      if (!row) continue;
      // `_assembly.json` keys its rows `phase:`, and a roster copied from it keeps that key.
      const n = asPhaseNumber(row.n ?? row.phase);
      if (n === null) {
        warnings.push({
          code: "run-record-phase-unnumbered",
          message: `${from} has a phase row with no 'n'`,
          subject: from,
        });
        continue;
      }
      if (phases.some((phase) => phase.n === n)) {
        warnings.push({
          code: "run-record-phase-duplicate",
          message: `${from} records phase ${n} more than once; the last row is read`,
          subject: String(n),
        });
      }
      phases.push({
        n,
        kind: asString(row.kind) ?? "mold",
        skill: asString(row.skill),
        pattern: asString(row.pattern),
        selected: asString(row.selected),
        status: asPhaseStatus(row.status),
        iterations: asNumber(row.iterations),
        artifacts: readArtifacts(row.artifacts, warnings, n, from),
      });
    }
  } else {
    warnings.push({
      code: "run-record-no-phases",
      message: `${from} carries no phase roster`,
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
      assembly_sha256: asToken(root.assembly_sha256, "assembly_sha256", from, warnings),
      foundry_head: asToken(root.foundry_head, "foundry_head", from, warnings),
      started_at: asInstant(root.started_at),
      finished_at: asInstant(root.finished_at),
      status: asRunStatus(root.status),
      phases: phases.sort((a, b) => a.n - b.n),
    },
    path: from,
    warnings,
  };
}

/** `filename` is the registry's `default_filename`; the constant stands in when none is passed. */
export function readRunRecord(runDir: string, filename = RUN_RECORD_FILENAME): RunRecordLoad {
  const file = path.join(runDir, filename);
  if (!existsSync(file)) return { record: null, path: null, warnings: [] };
  return parseRunRecord(readFileSync(file, "utf8"), filename);
}
