// Match the steps a `gxwf diff --json` reports removed against `kind: dropped` ledger entries.

import { InputShapeError, isRecord, isStepDrop, ledgerEntries, recordId } from "./ledger.js";

export interface RemovedStep {
  step: string;
  label: string | null;
  dropped_entries: string[];
}

export interface StepRemovalCheck {
  ok: boolean;
  removed_steps: RemovedStep[];
  unlabelled: string[];
  unwired_inputs: string[];
}

function removedSteps(diff: unknown): Record<string, unknown> {
  const removed = isRecord(diff) && isRecord(diff.steps) ? diff.steps.removed : undefined;
  if (!isRecord(removed))
    throw new InputShapeError("diff has no steps.removed object; expected gxwf diff --json");
  return removed;
}

function unwiredInputs(diff: unknown): string[] {
  const unwired = isRecord(diff) ? diff.unwired_inputs : undefined;
  if (unwired === undefined) return [];
  if (!Array.isArray(unwired) || !unwired.every((id) => typeof id === "string"))
    throw new InputShapeError("diff unwired_inputs is not a list of input ids");
  return unwired;
}

export function checkStepRemovals(diff: unknown, ledger: unknown): StepRemovalCheck {
  const removed = removedSteps(diff);
  const unwired_inputs = unwiredInputs(diff);
  const drops = ledgerEntries(ledger).filter(isStepDrop);
  const removed_steps = Object.entries(removed).map(([step, summary]): RemovedStep => {
    const label = isRecord(summary) && typeof summary.label === "string" ? summary.label : null;
    // A nested step's key is `<parent>/<key>`; its bare label would match other levels' steps.
    const names = label !== null && !step.includes("/") ? [step, label] : [step];
    const dropped_entries = drops.filter((entry) => names.includes(entry.step)).map(recordId);
    return { step, label, dropped_entries };
  });
  const unlabelled = removed_steps
    .filter((removedStep) => removedStep.dropped_entries.length === 0)
    .map((removedStep) => removedStep.step);
  return { ok: unlabelled.length === 0, removed_steps, unlabelled, unwired_inputs };
}
