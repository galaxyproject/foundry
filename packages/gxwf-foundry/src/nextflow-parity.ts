// Join a nextflow-to-galaxy run's summary, ledger, pre-loop draft snapshot, final workflow and
// their `gxwf diff --json` into the structured half of the source-parity report.

import YAML from "yaml";
import {
  backticked,
  hasReason,
  InputShapeError,
  isRecord,
  ledgerDecisions,
  ledgerEntries,
  recordId,
  sourceArg,
  unitNames,
  type LedgerRecord,
} from "./ledger.js";
import {
  checkScopeRecords,
  isScopeDrop,
  type ScopeRecordCheck,
  type ScopeSummary,
} from "./scope-records.js";
import { checkStepRemovals } from "./step-removals.js";

export interface NextflowParityInputs {
  summary: unknown;
  ledger: unknown;
  snapshot: unknown;
  workflow: unknown;
  diff: unknown;
}

export interface CallSource {
  call: string;
  process: string | null;
  tool: string | null;
  tool_versions: string[];
  container: string | null;
  conda: string | null;
}

export interface StepParity {
  step: string;
  label: string | null;
  status: "kept" | "removed" | "added";
  /** What the snapshot's `_plan_state` holds: a calls document, plain text, nothing, or no snapshot step. */
  plan_state: "calls" | "text" | "none" | "absent";
  calls: string[];
  calls_from: "plan_state" | "records" | null;
  tool_id: string | null;
  tool_version: string | null;
  /** The final workflow step's `state`, else its object `tool_state`; null for a removed step or none. */
  state: Record<string, unknown> | null;
  source: CallSource[];
  dropped_entries: string[];
}

export interface ArgRecord {
  id: string;
  step: string;
  collection: "decisions" | "entries";
  disposition: string | null;
  status?: string;
  flags?: string[];
}

export interface ArgRow {
  process: string;
  call: string;
  key: string;
  ids: string[];
  tie?: true;
  steps: string[];
  steps_from: "plan_state" | "records" | null;
  covered_by: string[];
  entries: { id: string; expression: string | null; records: ArgRecord[] }[];
}

export interface StrayRecord {
  id: string;
  step: string;
  arg: string;
  problem: "unknown-step" | "unknown-arg" | "not-effective" | "other-step";
}

export interface ParityFinding {
  kind:
    | "step-removed-unrecorded"
    | "output-removed-unrecorded"
    | "input-unwired"
    | "source-arg-unrecorded"
    | "source-arg-stray"
    | "source-arg-malformed"
    | "call-unmapped"
    | "scope-record";
  subject: string;
  detail?: string;
}

export interface NextflowParity {
  steps: StepParity[];
  inputs: { added: unknown; removed: unknown; unwired: string[] };
  outputs: {
    added: unknown;
    changed: unknown;
    removed: { output: string; source_step: string | null; dropped_entries: string[] }[];
  };
  source_args: {
    rows: ArgRow[];
    overridden: { process: string; id: string; key: string; expression: string | null }[];
    stray_records: StrayRecord[];
  };
  scope: ScopeRecordCheck;
  other_drops: { id: string; status: unknown; units: unknown; because: unknown }[];
  findings: ParityFinding[];
}

interface SummaryEntry {
  id: string;
  key: string;
  expression?: string;
}
interface SummaryProcess {
  name: string;
  aliases?: string[];
  tool?: string | null;
  container?: string | null;
  conda?: string | null;
  resolved_args?: SummaryEntry[];
  effective_args?: { call: string; key: string; ids: string[]; tie?: true }[];
}
interface SummaryTool {
  name: string;
  version: string;
  versions?: string[];
}
interface Summary extends ScopeSummary {
  processes?: SummaryProcess[];
  tools?: SummaryTool[];
}

const str = (value: unknown): string | null => (typeof value === "string" ? value : null);
const nonEmpty = (value: unknown): string | null => str(value) || null;

type StepMap = Map<string, Record<string, unknown>>;

/** One level's steps keyed as `gxwf diff` keys them: dict key, else label, id or input-offset index. */
function levelSteps(doc: unknown): [string, Record<string, unknown>][] {
  const raw = isRecord(doc) ? doc.steps : undefined;
  const inputs = isRecord(doc) ? doc.inputs : undefined;
  const offset = Array.isArray(inputs)
    ? inputs.length
    : isRecord(inputs)
      ? Object.keys(inputs).length
      : 0;
  const pairs: [string, unknown][] = Array.isArray(raw)
    ? raw.map((step, i) => [
        (isRecord(step) && (nonEmpty(step.label) ?? nonEmpty(step.id))) || String(i + offset),
        step,
      ])
    : isRecord(raw)
      ? Object.entries(raw)
      : [];
  return pairs.filter((pair): pair is [string, Record<string, unknown>] => isRecord(pair[1]));
}

const inlineRun = (step: Record<string, unknown> | undefined) =>
  isRecord(step?.run) && "steps" in step.run ? step.run : undefined;

/** Both sides' steps; like `gxwf diff`, inner steps appear as `<parent>/<key>` only under a step inline on both sides. */
function joinSteps(
  before: unknown,
  after: unknown,
  prefix = "",
  out: { snapshot: StepMap; final: StepMap } = { snapshot: new Map(), final: new Map() },
) {
  const b = new Map(levelSteps(before).map(([key, step]) => [prefix + key, step]));
  const a = new Map(levelSteps(after).map(([key, step]) => [prefix + key, step]));
  for (const [key, step] of b) out.snapshot.set(key, step);
  for (const [key, step] of a) out.final.set(key, step);
  for (const key of b.keys()) {
    const [bRun, aRun] = [inlineRun(b.get(key)), inlineRun(a.get(key))];
    if (bRun && aRun) joinSteps(bRun, aRun, `${key}/`, out);
  }
  return out;
}

function planCalls(step: Record<string, unknown> | undefined): {
  plan_state: StepParity["plan_state"];
  calls: string[] | null;
} {
  if (!step) return { plan_state: "absent", calls: null };
  const text = step._plan_state;
  if (typeof text !== "string") return { plan_state: "none", calls: null };
  let doc: unknown;
  try {
    doc = YAML.parse(text);
  } catch {
    return { plan_state: "text", calls: null };
  }
  const calls = isRecord(doc) ? doc.calls : undefined;
  return Array.isArray(calls) && calls.every((call) => typeof call === "string")
    ? { plan_state: "calls", calls }
    : { plan_state: "text", calls: null };
}

/** Output name → its `outputSource`, from a dict or a list of outputs. */
function outputSources(doc: unknown): Map<string, string | null> {
  const raw = isRecord(doc) ? doc.outputs : undefined;
  const pairs: [string, unknown][] = Array.isArray(raw)
    ? raw.filter(isRecord).map((o) => [str(o.label) ?? str(o.id) ?? "", o])
    : isRecord(raw)
      ? Object.entries(raw)
      : [];
  return new Map(
    pairs.map(([name, o]) => [name, isRecord(o) ? str(o.outputSource) : null] as const),
  );
}

const diffSection = (diff: unknown, key: "inputs" | "outputs") => {
  const section = isRecord(diff) ? diff[key] : undefined;
  if (!isRecord(section))
    throw new InputShapeError(`diff has no ${key} object; expected gxwf diff --json`);
  return section;
};

function disposition(record: LedgerRecord, collection: ArgRecord["collection"]): string | null {
  if (collection === "decisions") return str(record.disposition);
  return record.kind === "dropped" ? "dropped" : "gap";
}

/** Why a record with `source_arg` gives its entry no reason, or null when it does. */
function malformedReason(record: LedgerRecord, collection: ArgRecord["collection"]): string | null {
  if (!sourceArg(record)) return "source_arg has no string step and arg";
  if (collection === "decisions")
    return record.disposition === "carried" || record.disposition === "not_applicable"
      ? null
      : "disposition is not carried or not_applicable";
  return record.kind === "dropped" && !hasReason(record.because)
    ? "a dropped flag record has no because"
    : null;
}

function processLookup(processes: SummaryProcess[], tools: Map<string, SummaryTool>) {
  return (call: string): CallSource => {
    const name = call.split(":").at(-1)!;
    const process = processes.find((p) => p.name === name || (p.aliases ?? []).includes(name));
    const tool = process?.tool ? tools.get(process.tool) : undefined;
    return {
      call,
      process: process?.name ?? null,
      tool: process?.tool ?? null,
      tool_versions: tool ? (tool.versions ?? [tool.version]) : [],
      container: process?.container ?? null,
      conda: process?.conda ?? null,
    };
  };
}

function strayProblem(
  arg: string,
  stepKnown: boolean,
  resolvedIds: Set<string>,
  effectiveIds: Set<string>,
): StrayRecord["problem"] {
  if (!stepKnown) return "unknown-step";
  if (!resolvedIds.has(arg)) return "unknown-arg";
  return effectiveIds.has(arg) ? "other-step" : "not-effective";
}

export function assembleNextflowParity(inputs: NextflowParityInputs): NextflowParity {
  const summary = (isRecord(inputs.summary) ? inputs.summary : {}) as Summary;
  if (!Array.isArray(summary.processes))
    throw new InputShapeError("summary has no processes list; expected summary-nextflow.json");
  const removal = checkStepRemovals(inputs.diff, inputs.ledger);
  const diffInputs = diffSection(inputs.diff, "inputs");
  const diffOutputs = diffSection(inputs.diff, "outputs");
  const added = isRecord(inputs.diff) && isRecord(inputs.diff.steps) ? inputs.diff.steps.added : {};
  const addedKeys = new Set(isRecord(added) ? Object.keys(added) : []);
  const { snapshot: snapshotSteps, final: finalSteps } = joinSteps(
    inputs.snapshot,
    inputs.workflow,
  );
  const removedBy = new Map(removal.removed_steps.map((s) => [s.step, s.dropped_entries]));
  const mismatched = [
    ...[...snapshotSteps.keys()].filter((k) => !finalSteps.has(k) !== removedBy.has(k)),
    ...[...finalSteps.keys()].filter((k) => !snapshotSteps.has(k) !== addedKeys.has(k)),
  ];
  if (mismatched.length > 0)
    throw new InputShapeError(
      `steps ${mismatched.join(", ")} disagree with the diff; diff the snapshot against the final workflow`,
    );
  const processes = summary.processes;
  const sourceOf = processLookup(
    processes,
    new Map((summary.tools ?? []).map((tool) => [tool.name, tool])),
  );

  const ledgerRecords = [
    ...ledgerDecisions(inputs.ledger).map((r) => [r, "decisions"] as const),
    ...ledgerEntries(inputs.ledger).map((r) => [r, "entries"] as const),
  ].filter(([record]) => "source_arg" in record);
  const malformed: { subject: string; detail: string }[] = [];
  const records: { record: ArgRecord; arg: string }[] = [];
  for (const [record, collection] of ledgerRecords) {
    const detail = malformedReason(record, collection);
    if (detail) {
      malformed.push({ subject: recordId(record), detail });
      continue;
    }
    const arg = sourceArg(record)!;
    const status = str(record.status);
    records.push({
      arg: arg.arg,
      record: {
        id: recordId(record),
        step: arg.step,
        collection,
        disposition: disposition(record, collection),
        ...(status ? { status } : {}),
        ...(arg.flags ? { flags: arg.flags } : {}),
      },
    });
  }

  const keys = [...new Set([...snapshotSteps.keys(), ...finalSteps.keys()])];
  const planned = new Map(keys.map((key) => [key, planCalls(snapshotSteps.get(key))]));
  const callIds = new Map<string, string[]>();
  for (const process of processes)
    for (const { call, ids } of process.effective_args ?? [])
      callIds.set(call, [...(callIds.get(call) ?? []), ...ids]);
  const idCallCount = new Map<string, number>();
  for (const ids of callIds.values())
    for (const id of new Set(ids)) idCallCount.set(id, (idCallCount.get(id) ?? 0) + 1);
  const callSteps = new Map(
    [...callIds].map(([call, ids]): [string, Pick<ArgRow, "steps" | "steps_from">] => {
      const mapped = keys.filter((key) => planned.get(key)!.calls?.includes(call));
      if (mapped.length > 0) return [call, { steps: mapped, steps_from: "plan_state" }];
      // A step the template resolved keeps no `_plan_state`; its records on this call's own ids name it.
      const named = records
        .filter(
          ({ arg, record }) =>
            ids.includes(arg) &&
            idCallCount.get(arg) === 1 &&
            planned.has(record.step) &&
            !planned.get(record.step)!.calls,
        )
        .map(({ record }) => record.step);
      const unique = [...new Set(named)];
      return [call, { steps: unique, steps_from: unique.length > 0 ? "records" : null }];
    }),
  );
  const recordCalls = new Map<string, string[]>();
  for (const [call, { steps, steps_from }] of callSteps)
    if (steps_from === "records")
      for (const key of steps) recordCalls.set(key, [...(recordCalls.get(key) ?? []), call]);

  const steps: StepParity[] = keys.map((key) => {
    const before = snapshotSteps.get(key);
    const after = finalSteps.get(key);
    const { plan_state, calls: plan } = planned.get(key)!;
    const calls = plan ?? recordCalls.get(key) ?? [];
    const tooled = after ?? before ?? {};
    return {
      step: key,
      label: str(after?.label) ?? str(before?.label),
      status: removedBy.has(key) ? "removed" : addedKeys.has(key) ? "added" : "kept",
      plan_state,
      calls,
      calls_from: plan ? "plan_state" : recordCalls.has(key) ? "records" : null,
      tool_id: str(tooled.tool_id),
      tool_version: str(tooled.tool_version),
      state: [after?.state, after?.tool_state].find(isRecord) ?? null,
      source: calls.map(sourceOf),
      dropped_entries: removedBy.get(key) ?? [],
    };
  });
  const stepByKey = new Map(steps.map((s) => [s.step, s]));

  const drops = ledgerEntries(inputs.ledger).filter(
    (entry) => entry.kind === "dropped" && !("source_arg" in entry),
  );
  const rows: ArgRow[] = processes.flatMap((process) => {
    const byId = new Map((process.resolved_args ?? []).map((entry) => [entry.id, entry]));
    return (process.effective_args ?? []).map((effective): ArgRow => {
      const { steps: stepKeys, steps_from } = callSteps.get(effective.call)!;
      const segments = new Set([...effective.call.split(":"), process.name]);
      return {
        process: process.name,
        call: effective.call,
        key: effective.key,
        ids: effective.ids,
        ...(effective.tie ? { tie: true as const } : {}),
        steps: stepKeys,
        steps_from,
        covered_by:
          stepKeys.length > 0
            ? []
            : drops.filter((d) => unitNames(d.units).some((n) => segments.has(n))).map(recordId),
        entries: effective.ids.map((id) => ({
          id,
          expression: byId.get(id)?.expression ?? null,
          records: records
            .filter(({ arg, record }) => arg === id && stepKeys.includes(record.step))
            .map(({ record }) => record),
        })),
      };
    });
  });

  const effectiveIds = new Set(rows.flatMap((r) => r.ids));
  const resolvedIds = new Set(processes.flatMap((p) => (p.resolved_args ?? []).map((e) => e.id)));
  const attached = new Set(rows.flatMap((r) => r.entries.flatMap((e) => e.records)));
  const stray_records: StrayRecord[] = records
    .filter(({ record }) => !attached.has(record))
    .map(({ record, arg }) => ({
      id: record.id,
      step: record.step,
      arg,
      problem: strayProblem(arg, stepByKey.has(record.step), resolvedIds, effectiveIds),
    }));
  const overridden = processes.flatMap((process) =>
    (process.resolved_args ?? [])
      .filter((entry) => !(process.effective_args ?? []).some((r) => r.ids.includes(entry.id)))
      .map((entry) => ({
        process: process.name,
        id: entry.id,
        key: entry.key,
        expression: entry.expression ?? null,
      })),
  );

  const removedOutputs = Array.isArray(diffOutputs.removed) ? diffOutputs.removed : [];
  const sources = outputSources(inputs.snapshot);
  const outputsRemoved = removedOutputs
    .filter((name): name is string => typeof name === "string")
    .map((output) => {
      const source = sources.get(output) ?? "";
      const slash = source.lastIndexOf("/");
      const head = slash < 0 ? source : source.slice(0, slash);
      const source_step = snapshotSteps.has(head) ? head : null;
      const named = drops.filter((d) => backticked(d.units).includes(output)).map(recordId);
      return {
        output,
        source_step,
        dropped_entries: [
          ...new Set([...(source_step ? (removedBy.get(source_step) ?? []) : []), ...named]),
        ],
      };
    });

  const scope = checkScopeRecords(inputs.ledger, summary);
  const matchedStepDrops = new Set(removal.removed_steps.flatMap((s) => s.dropped_entries));
  const other_drops = drops
    .filter((d) => !isScopeDrop(d) && !matchedStepDrops.has(recordId(d)))
    .map((d) => ({ id: recordId(d), status: d.status, units: d.units, because: d.because }));

  const findings: ParityFinding[] = [
    ...removal.unlabelled.map((subject) => ({ kind: "step-removed-unrecorded" as const, subject })),
    ...outputsRemoved
      .filter((o) => o.dropped_entries.length === 0)
      .map((o) => ({
        kind: "output-removed-unrecorded" as const,
        subject: o.output,
        ...(o.source_step ? { detail: o.source_step } : {}),
      })),
    ...removal.unwired_inputs.map((subject) => ({ kind: "input-unwired" as const, subject })),
    ...rows.flatMap((row) =>
      row.steps
        .filter((key) => stepByKey.get(key)?.status !== "removed")
        .flatMap((key) =>
          row.entries
            .filter((entry) => !entry.records.some((r) => r.step === key))
            .map((entry) => ({
              kind: "source-arg-unrecorded" as const,
              subject: key,
              detail: entry.id,
            })),
        ),
    ),
    ...stray_records.map((r) => ({
      kind: "source-arg-stray" as const,
      subject: r.id,
      detail: r.problem,
    })),
    ...[
      ...new Set(
        rows
          .filter((row) => row.steps.length === 0 && row.covered_by.length === 0)
          .map((row) => row.call),
      ),
    ].map((subject) => ({ kind: "call-unmapped" as const, subject })),
    ...malformed.map((m) => ({ kind: "source-arg-malformed" as const, ...m })),
    ...scope.problems.map((p) => ({
      kind: "scope-record" as const,
      subject: p.record,
      detail: p.problem,
    })),
  ];

  return {
    steps,
    inputs: {
      added: diffInputs.added,
      removed: diffInputs.removed,
      unwired: removal.unwired_inputs,
    },
    outputs: { added: diffOutputs.added, changed: diffOutputs.changed, removed: outputsRemoved },
    source_args: { rows, overridden, stray_records },
    scope,
    other_drops,
    findings,
  };
}
