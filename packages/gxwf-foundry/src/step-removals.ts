// Match the steps a `gxwf diff --json` reports removed against `kind: dropped` ledger entries.

export class StepRemovalInputError extends Error {}

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

type Entry = Record<string, unknown>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function removedSteps(diff: unknown): Record<string, unknown> {
  const removed = isRecord(diff) && isRecord(diff.steps) ? diff.steps.removed : undefined;
  if (!isRecord(removed))
    throw new StepRemovalInputError("diff has no steps.removed object; expected gxwf diff --json");
  return removed;
}

function unwiredInputs(diff: unknown): string[] {
  const unwired = isRecord(diff) ? diff.unwired_inputs : undefined;
  if (unwired === undefined) return [];
  if (!Array.isArray(unwired) || !unwired.every((id) => typeof id === "string"))
    throw new StepRemovalInputError("diff unwired_inputs is not a list of input ids");
  return unwired;
}

/** A mapping with `entries:`, or a bare list of entries, as run ledgers have been written. */
function ledgerEntries(ledger: unknown): Entry[] {
  if (ledger === null || ledger === undefined) return [];
  if (Array.isArray(ledger)) return ledger.filter(isRecord);
  if (!isRecord(ledger))
    throw new StepRemovalInputError("ledger is neither a YAML mapping nor a list of entries");
  const entries = ledger.entries ?? [];
  if (!Array.isArray(entries)) throw new StepRemovalInputError("ledger entries is not a list");
  return entries.filter(isRecord);
}

/** `because` has been written as a string and as a list of strings. */
const hasReason = (because: unknown): boolean =>
  typeof because === "string"
    ? because.trim().length > 0
    : Array.isArray(because) && because.some(hasReason);

/** A step drop: `kind: dropped`, a top-level `step`, a non-empty `because`, and no `source_arg`. */
function isStepDrop(entry: Entry): entry is Entry & { step: string } {
  return (
    entry.kind === "dropped" &&
    typeof entry.step === "string" &&
    hasReason(entry.because) &&
    !("source_arg" in entry)
  );
}

export function checkStepRemovals(diff: unknown, ledger: unknown): StepRemovalCheck {
  const removed = removedSteps(diff);
  const unwired_inputs = unwiredInputs(diff);
  const drops = ledgerEntries(ledger).filter(isStepDrop);
  const removed_steps = Object.entries(removed).map(([step, summary]): RemovedStep => {
    const label = isRecord(summary) && typeof summary.label === "string" ? summary.label : null;
    // A nested step's key is `<parent>/<key>`; its bare label would match other levels' steps.
    const names = label !== null && !step.includes("/") ? [step, label] : [step];
    const dropped_entries = drops
      .filter((entry) => names.includes(entry.step))
      .map((entry) => (typeof entry.id === "string" ? entry.id : "(no id)"));
    return { step, label, dropped_entries };
  });
  const unlabelled = removed_steps
    .filter((removedStep) => removedStep.dropped_entries.length === 0)
    .map((removedStep) => removedStep.step);
  return { ok: unlabelled.length === 0, removed_steps, unlabelled, unwired_inputs };
}
