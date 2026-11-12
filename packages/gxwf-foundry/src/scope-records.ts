// Check the ledger's source-scope records: one scope decision, its scope drops, and their summary citations.

import {
  isRecord,
  ledgerDecisions,
  ledgerEntries,
  recordId,
  unitNames,
  type LedgerRecord,
} from "./ledger.js";

export const SCOPE_OWNER = "nextflow-summary-to-galaxy-interface";

export interface ScopeControl {
  control: string;
  value: unknown;
  from: string;
}

export interface ScopeDrop {
  id: string;
  status: unknown;
  decision: string | null;
  selected_by: ScopeControl[];
  units: string | null;
  unit_names: string[];
}

export interface ScopeProblem {
  record: string;
  problem: string;
}

export interface ScopeRecordCheck {
  ok: boolean;
  decision: { id: string; candidate: string | null; controls: ScopeControl[] } | null;
  drops: ScopeDrop[];
  problems: ScopeProblem[];
}

interface SummaryParam {
  name: string;
  type?: string;
  default?: unknown;
  enum?: unknown[];
}

/** The summary fields scope citations resolve against. */
export interface ScopeSummary {
  params?: SummaryParam[];
  profiles?: { name: string }[];
  processes?: { name: string; aliases?: string[] }[];
  subworkflows?: { name: string; calls?: string[] }[];
  test_candidates?: { id: string; params_delta?: Record<string, unknown> }[];
  workflow?: { conditionals?: { guard: string; affects: string[] }[] };
}

export const isScopeDecision = (record: LedgerRecord): boolean => "scope" in record;
export const isScopeDrop = (record: LedgerRecord): boolean => "scope_branch" in record;

function controls(value: unknown): ScopeControl[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const parsed = value.filter(
    (item): item is ScopeControl =>
      isRecord(item) &&
      typeof item.control === "string" &&
      typeof item.from === "string" &&
      "value" in item,
  );
  return parsed.length === value.length ? parsed : undefined;
}

const controlKey = ({ control, value }: ScopeControl): string => `${control}=${String(value)}`;

/** Problems with one `from` citation: `<array>[<key>]` plus an optional field, backing the value. */
export function citationProblems(
  summary: ScopeSummary,
  { control, value, from }: ScopeControl,
): string[] {
  const match =
    /^(params|profiles|test_candidates|workflow\.conditionals)\[([^\]]+)\](?:\.(\w+))?$/.exec(from);
  if (!match) return [`unparseable from: ${from}`];
  const [, array, key, field] = match as unknown as [string, string, string, string | undefined];
  const param = control.startsWith("params.") ? control.slice("params.".length) : undefined;
  const problems: string[] = [];
  const fail = (problem: string) => problems.push(`${from}: ${problem}`);
  if (array === "params") {
    const entry = summary.params?.find((p) => p.name === key);
    if (param !== key) fail(`cites params[${key}] for control ${control}`);
    if (!entry) fail("no such param in the summary");
    else if (field === "enum") {
      if (!entry.enum?.includes(value)) fail(`${String(value)} is not in the param's enum`);
    } else if (field === "default") {
      if (entry.default !== value) fail(`${String(value)} is not the param's default`);
    } else if (field !== undefined) fail(`unknown field ${field}`);
    else if (entry.type !== "boolean" || value !== true)
      fail("a bare params citation backs only a boolean set true");
  } else if (array === "profiles") {
    if (control !== "profile") fail(`cites a profile for control ${control}`);
    if (key !== value) fail(`profile ${key} is not the value ${String(value)}`);
    if (!summary.profiles?.some((p) => p.name === key)) fail("no such profile in the summary");
  } else if (array === "test_candidates") {
    const candidate = summary.test_candidates?.find((c) => c.id === key);
    if (!candidate) fail("no such test candidate in the summary");
    if (field === "params_delta") {
      if (param === undefined) fail(`cites params_delta for control ${control}`);
      else if (candidate && candidate.params_delta?.[param] !== value)
        fail(`the candidate's params_delta.${param} is not ${String(value)}`);
    } else if (field !== undefined) fail(`unknown field ${field}`);
    else {
      // The candidate's file stem must be the value or end in `_<value>`.
      const stem = /([^/]+)\.nf\.test::/.exec(key)?.[1] ?? "";
      if (!`_${stem}`.endsWith(`_${String(value)}`))
        fail(`the candidate's file stem ${stem} does not name ${String(value)}`);
    }
  } else {
    const conditional = summary.workflow?.conditionals?.find((c) => c.affects.includes(key));
    if (!conditional) fail("no conditional affects that name");
    if (param === undefined) fail(`cites a conditional for control ${control}`);
    else if (conditional && !conditional.guard.includes(param))
      fail(`the guard does not test ${param}`);
    if (conditional && !conditional.guard.includes(String(value)))
      fail(`the guard does not test ${String(value)}`);
  }
  return problems;
}

function summaryUnits(summary: ScopeSummary): Set<string> {
  return new Set([
    ...(summary.subworkflows ?? []).flatMap((s) => [s.name, ...(s.calls ?? [])]),
    ...(summary.processes ?? []).flatMap((p) => [p.name, ...(p.aliases ?? [])]),
  ]);
}

/** Check scope record shape; with a summary, also check every citation and unit name against it. */
export function checkScopeRecords(ledger: unknown, summary?: ScopeSummary): ScopeRecordCheck {
  const problems: ScopeProblem[] = [];
  const fail = (record: string, problem: string) => problems.push({ record, problem });
  const decisions = ledgerDecisions(ledger).filter(isScopeDecision);
  const dropRecords = ledgerEntries(ledger).filter(isScopeDrop);
  if (decisions.length > 1)
    fail(decisions.map(recordId).join(", "), "more than one scope decision");
  if (decisions.length === 0 && dropRecords.length > 0)
    fail("(ledger)", "scope drops with no scope decision");

  let decision: ScopeRecordCheck["decision"] = null;
  const scopeRecord = decisions[0];
  if (scopeRecord) {
    const id = recordId(scopeRecord);
    const scope = isRecord(scopeRecord.scope) ? scopeRecord.scope : {};
    const fixed = controls(scope.controls);
    if (scopeRecord.decided_by !== SCOPE_OWNER) fail(id, `decided_by is not ${SCOPE_OWNER}`);
    if (!fixed || fixed.length === 0) fail(id, "scope.controls is not a non-empty control list");
    const candidate = typeof scope.candidate === "string" ? scope.candidate : null;
    decision = { id, candidate, controls: fixed ?? [] };
    if (summary) {
      if (candidate && !summary.test_candidates?.some((c) => c.id === candidate))
        fail(id, `candidate ${candidate} is not a summary test candidate`);
      for (const control of fixed ?? [])
        for (const problem of citationProblems(summary, control)) fail(id, problem);
    }
  }

  const fixedKeys = new Set((decision?.controls ?? []).map(controlKey));
  const units = summary ? summaryUnits(summary) : undefined;
  const drops = dropRecords.map((record): ScopeDrop => {
    const id = recordId(record);
    const branch = isRecord(record.scope_branch) ? record.scope_branch : {};
    const selected = controls(branch.selected_by);
    const names = unitNames(record.units);
    const drop: ScopeDrop = {
      id,
      status: record.status,
      decision: typeof branch.decision === "string" ? branch.decision : null,
      selected_by: selected ?? [],
      units: typeof record.units === "string" ? record.units : null,
      unit_names: names,
    };
    if (record.status !== "open") fail(id, "status is not open");
    if (record.kind !== "dropped") fail(id, "kind is not dropped");
    if (record.raised_by !== SCOPE_OWNER) fail(id, `raised_by is not ${SCOPE_OWNER}`);
    if (decision && drop.decision !== decision.id)
      fail(id, `scope_branch.decision is not ${decision.id}`);
    if (!selected || selected.length === 0)
      fail(id, "scope_branch.selected_by is not a non-empty control list");
    for (const control of selected ?? []) {
      if (fixedKeys.has(controlKey(control)))
        fail(id, `selected_by repeats the fixed control ${controlKey(control)}`);
      if (summary) for (const problem of citationProblems(summary, control)) fail(id, problem);
    }
    if (names.length === 0) fail(id, "units names no backticked summary subworkflow or process");
    for (const name of names)
      if (units && !units.has(name)) fail(id, `unit ${name} is not in the summary`);
    if (!decision || typeof record.because !== "string" || !record.because.includes(decision.id))
      fail(id, "because does not name the scope decision");
    if ("step" in record) fail(id, "a scope drop has no top-level step");
    if ("source_arg" in record) fail(id, "a scope drop has no source_arg");
    return drop;
  });

  return { ok: problems.length === 0, decision, drops, problems };
}
