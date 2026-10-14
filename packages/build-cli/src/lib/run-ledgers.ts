// Reads the two YAML ledgers a run carries.
//
// Both are specified in draft research notes and written by agents over the course of a run, so
// both are read permissively: unknown fields are ignored, absent fields become null, and a row
// that cannot be named is counted rather than thrown on. The counts these produce are the
// dashboard's headline numbers, so they are computed from what is actually in the file rather than
// from what the note says should be.

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import yaml from "js-yaml";

import type {
  FeedbackEntry,
  FeedbackLedgerModel,
  OpenRequirementsEntry,
  OpenRequirementsModel,
} from "./run-model.js";

export const OPEN_REQUIREMENTS_FILENAME = "open-requirements.ledger.yml";
export const FEEDBACK_LEDGER_FILENAME = "foundry-feedback.ledger.yml";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | null {
  if (typeof value === "string") return value.length > 0 ? value : null;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

/** `units:` and `because:` are free-form and have arrived as both scalars and lists. */
function asProse(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value.length > 0 ? value : null;
  if (Array.isArray(value)) return value.map((item) => asProse(item) ?? "").join("; ") || null;
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function tally(values: Array<string | null>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const value of values) {
    const key = value ?? "unspecified";
    out[key] = (out[key] ?? 0) + 1;
  }
  return out;
}

function loadYaml(file: string): unknown | null {
  try {
    return yaml.load(readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

/**
 * The obligations ledger: what the workflow being built still owes.
 *
 * Accepts both shapes seen in the wild — a bare list of entries, and a mapping with `entries:`
 * plus an optional `topology_repair:` block.
 */
export function parseOpenRequirements(parsed: unknown, from: string): OpenRequirementsModel | null {
  const root = asRecord(parsed);
  const rawEntries = Array.isArray(parsed)
    ? parsed
    : Array.isArray(root?.entries)
      ? root.entries
      : null;
  if (!rawEntries) return null;

  const entries: OpenRequirementsEntry[] = [];
  for (const raw of rawEntries) {
    const row = asRecord(raw);
    if (!row) continue;
    entries.push({
      id: asString(row.id) ?? `entry-${entries.length + 1}`,
      status: asString(row.status) ?? "open",
      kind: asString(row.kind),
      blocking: asBoolean(row.blocking),
      raised_by: asString(row.raised_by),
      raised_by_phase: null,
      raised_by_href: null,
      resolved_by: asString(row.resolved_by),
      resolved_by_phase: null,
      resolved_by_href: null,
      step: asString(row.step),
      unmet: asProse(row.unmet),
      missing: asProse(row.missing),
      supersedes: asString(row.supersedes),
      note: asProse(row.note),
      units: asProse(row.units),
      because: asProse(row.because),
    });
  }

  const repairBlock = asRecord(root?.topology_repair);
  const topology = repairBlock
    ? {
        escalations: asNumber(repairBlock.escalations) ?? 0,
        cap: asNumber(repairBlock.cap) ?? 0,
        open_history: Array.isArray(repairBlock.open_history)
          ? repairBlock.open_history.filter((n): n is number => typeof n === "number")
          : [],
      }
    : null;

  return {
    path: from,
    entry_count: entries.length,
    topology_repair: topology,
    counts: {
      open: entries.filter((e) => e.status === "open").length,
      resolved: entries.filter((e) => e.status === "resolved").length,
      surrendered: entries.filter((e) => e.status === "surrendered").length,
      blocking_open: entries.filter((e) => e.status === "open" && e.blocking === true).length,
      dropped: entries.filter((e) => e.kind === "dropped").length,
    },
    entries,
  };
}

export function readOpenRequirements(runDir: string): OpenRequirementsModel | null {
  const file = path.join(runDir, OPEN_REQUIREMENTS_FILENAME);
  if (!existsSync(file)) return null;
  const parsed = loadYaml(file);
  if (parsed === null) return null;
  return parseOpenRequirements(parsed, OPEN_REQUIREMENTS_FILENAME);
}

/** The feedback ledger: what the run showed to be wrong with the Foundry itself. */
export function parseFeedbackLedger(parsed: unknown, from: string): FeedbackLedgerModel | null {
  const root = asRecord(parsed);
  if (!root) return null;
  const runBlock = asRecord(root.run);

  const entries: FeedbackEntry[] = [];
  if (Array.isArray(root.entries)) {
    for (const raw of root.entries) {
      const row = asRecord(raw);
      if (!row) continue;
      const subject = asRecord(row.subject);
      const observed = asRecord(row.observed_in);
      entries.push({
        id: asString(row.id) ?? `entry-${entries.length + 1}`,
        raised_by: asString(row.raised_by),
        raised_by_phase: null,
        kind: asString(row.kind),
        severity: asString(row.severity),
        status: asString(row.status),
        what: asProse(row.what),
        expected: asProse(row.expected),
        evidence: asProse(row.evidence),
        issue: asString(row.issue),
        subject_kind: subject ? asString(subject.kind) : null,
        subject_label: subject ? asString(subject.label) : null,
        subject_locator: subject ? asString(subject.locator) : null,
        subject_href: null,
        observed_revision: observed ? asNumber(observed.revision) : null,
        observed_foundry_head: observed ? asString(observed.foundry_head) : null,
      });
    }
  }

  return {
    path: from,
    run: {
      pipeline: runBlock ? asString(runBlock.pipeline) : null,
      run_slug: runBlock ? asString(runBlock.run_slug) : null,
      status: runBlock ? asString(runBlock.status) : null,
    },
    counts: {
      total: entries.length,
      by_kind: tally(entries.map((e) => e.kind)),
      by_severity: tally(entries.map((e) => e.severity)),
      by_status: tally(entries.map((e) => e.status)),
    },
    entries,
  };
}

export function readFeedbackLedger(runDir: string): FeedbackLedgerModel | null {
  const file = path.join(runDir, FEEDBACK_LEDGER_FILENAME);
  if (!existsSync(file)) return null;
  const parsed = loadYaml(file);
  if (parsed === null) return null;
  return parseFeedbackLedger(parsed, FEEDBACK_LEDGER_FILENAME);
}

/**
 * The phase roster the feedback ledger carries in its `run:` header.
 *
 * This predates the run record and remains the only phase roster a pre-record run has. It is read
 * separately from the entries because a reader may want the roster from a run that recorded no
 * feedback at all.
 */
export interface LedgerPhaseRow {
  n: number;
  kind: string | null;
  skill: string | null;
  status: string | null;
  iterations: number | null;
  selected: string | null;
  feedback_checked: boolean | null;
}

export function readFeedbackLedgerPhases(runDir: string): LedgerPhaseRow[] {
  const file = path.join(runDir, FEEDBACK_LEDGER_FILENAME);
  if (!existsSync(file)) return [];
  const root = asRecord(loadYaml(file));
  const runBlock = asRecord(root?.run);
  if (!runBlock || !Array.isArray(runBlock.phases)) return [];
  const rows: LedgerPhaseRow[] = [];
  for (const raw of runBlock.phases) {
    const row = asRecord(raw);
    const n = row ? asNumber(row.n) : null;
    if (n === null) continue;
    rows.push({
      n,
      kind: asString(row!.kind),
      skill: asString(row!.skill),
      status: asString(row!.status),
      iterations: asNumber(row!.iterations),
      selected: asString(row!.selected),
      feedback_checked: asBoolean(row!.feedback_checked),
    });
  }
  return rows.sort((a, b) => a.n - b.n);
}
