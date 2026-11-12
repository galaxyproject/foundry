// Join a nextflow-to-galaxy run's summary, ledger, pre-loop draft snapshot, final workflow and
// their `gxwf diff --json` into the structured half of the source-parity report.

import YAML from "yaml";
import {
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

/** Steps keyed as `gxwf diff` keys them: dict key, else label then id, and `<parent>/<key>` inside inline subworkflows. */
function workflowSteps(doc: unknown, prefix = ""): Map<string, Record<string, unknown>> {
  const steps = new Map<string, Record<string, unknown>>();
  const raw = isRecord(doc) ? doc.steps : undefined;
  const pairs: [string, unknown][] = Array.isArray(raw)
    ? raw.map((step, i) => [
        (isRecord(step) && (str(step.label) ?? str(step.id))) || String(i),
        step,
      ])
    : isRecord(raw)
      ? Object.entries(raw)
      : [];
  for (const [key, step] of pairs) {
    if (!isRecord(step)) continue;
    const path = prefix ? `${prefix}/${key}` : key;
    steps.set(path, step);
    if (isRecord(step.run) && "steps" in step.run)
      for (const [inner, value] of workflowSteps(step.run, path)) steps.set(inner, value);
  }
  return steps;
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

export function assembleNextflowParity(inputs: NextflowParityInputs): NextflowParity {
  const summary = (isRecord(inputs.summary) ? inputs.summary : {}) as Summary;
  if (!Array.isArray(summary.processes))
    throw new InputShapeError("summary has no processes list; expected summary-nextflow.json");
  const removal = checkStepRemovals(inputs.diff, inputs.ledger);
  const diffInputs = diffSection(inputs.diff, "inputs");
  const diffOutputs = diffSection(inputs.diff, "outputs");
  const added = isRecord(inputs.diff) && isRecord(inputs.diff.steps) ? inputs.diff.steps.added : {};
  const snapshotSteps = workflowSteps(inputs.snapshot);
  const finalSteps = workflowSteps(inputs.workflow);
  const processes = summary.processes;
  const tools = new Map((summary.tools ?? []).map((tool) => [tool.name, tool]));

  const records = [
    ...ledgerDecisions(inputs.ledger).map((r) => [r, "decisions"] as const),
    ...ledgerEntries(inputs.ledger).map((r) => [r, "entries"] as const),
  ].flatMap(([record, collection]) => {
    const arg = sourceArg(record);
    if (!arg) return [];
    const status = str(record.status);
    const out: ArgRecord = {
      id: recordId(record),
      step: arg.step,
      collection,
      disposition: disposition(record, collection),
      ...(status ? { status } : {}),
      ...(arg.flags ? { flags: arg.flags } : {}),
    };
    return [{ record: out, arg: arg.arg }];
  });

  const removedBy = new Map(removal.removed_steps.map((s) => [s.step, s.dropped_entries]));
  const keys = [...new Set([...snapshotSteps.keys(), ...finalSteps.keys()])];
  const steps: StepParity[] = keys.map((key) => {
    const before = snapshotSteps.get(key);
    const after = finalSteps.get(key);
    const { plan_state, calls } = planCalls(before);
    const status = removedBy.has(key)
      ? "removed"
      : isRecord(added) && key in added
        ? "added"
        : after
          ? "kept"
          : "removed";
    const tooled = after ?? before ?? {};
    return {
      step: key,
      label: str(after?.label) ?? str(before?.label),
      status,
      plan_state,
      calls: calls ?? [],
      calls_from: calls ? "plan_state" : null,
      tool_id: str(tooled.tool_id),
      tool_version: str(tooled.tool_version),
      source: [],
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
      const mapped = steps.filter(
        (s) => s.calls_from === "plan_state" && s.calls.includes(effective.call),
      );
      let stepKeys = mapped.map((s) => s.step);
      let steps_from: ArgRow["steps_from"] = stepKeys.length > 0 ? "plan_state" : null;
      if (stepKeys.length === 0) {
        // A step the template resolved keeps no `_plan_state`; its flag records still name it.
        stepKeys = [
          ...new Set(
            records
              .filter(
                ({ arg, record }) =>
                  effective.ids.includes(arg) &&
                  stepByKey.get(record.step)?.calls_from !== "plan_state" &&
                  stepByKey.has(record.step),
              )
              .map(({ record }) => record.step),
          ),
        ];
        if (stepKeys.length > 0) steps_from = "records";
      }
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

  for (const row of rows.filter((r) => r.steps_from === "records"))
    for (const key of row.steps) {
      const step = stepByKey.get(key)!;
      step.calls_from = "records";
      if (!step.calls.includes(row.call)) step.calls.push(row.call);
    }

  const processFor = (call: string) => {
    const name = call.split(":").at(-1)!;
    return processes.find((p) => p.name === name || (p.aliases ?? []).includes(name));
  };
  for (const step of steps)
    step.source = step.calls.map((call): CallSource => {
      const process = processFor(call);
      const tool = process?.tool ? tools.get(process.tool) : undefined;
      return {
        call,
        process: process?.name ?? null,
        tool: process?.tool ?? null,
        tool_versions: tool ? (tool.versions ?? [tool.version]) : [],
        container: process?.container ?? null,
        conda: process?.conda ?? null,
      };
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
      problem: !stepByKey.has(record.step)
        ? "unknown-step"
        : !resolvedIds.has(arg)
          ? "unknown-arg"
          : !effectiveIds.has(arg)
            ? "not-effective"
            : "other-step",
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
      return {
        output,
        source_step,
        dropped_entries: source_step ? (removedBy.get(source_step) ?? []) : [],
      };
    });

  const scope = checkScopeRecords(inputs.ledger, summary);
  const other_drops = drops
    .filter((d) => !("step" in d) && !isScopeDrop(d))
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
    ...rows
      .filter((row) => row.steps.length === 0 && row.covered_by.length === 0)
      .map((row) => row.call)
      .filter((call, i, calls) => calls.indexOf(call) === i)
      .map((subject) => ({ kind: "call-unmapped" as const, subject })),
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
