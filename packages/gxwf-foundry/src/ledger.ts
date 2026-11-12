// Readers for the open-requirements ledger's collections and the record kinds later checks join on.

/** Input that parsed but has the wrong shape; the CLI exits 3 on it. */
export class InputShapeError extends Error {}

export type LedgerRecord = Record<string, unknown>;

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function collection(ledger: unknown, key: "entries" | "decisions"): LedgerRecord[] {
  if (ledger === null || ledger === undefined) return [];
  if (Array.isArray(ledger)) return key === "entries" ? ledger.filter(isRecord) : [];
  if (!isRecord(ledger))
    throw new InputShapeError("ledger is neither a YAML mapping nor a list of entries");
  const items = ledger[key] ?? [];
  if (!Array.isArray(items)) throw new InputShapeError(`ledger ${key} is not a list`);
  return items.filter(isRecord);
}

/** A mapping's `entries:`, or a bare list of entries, as run ledgers have been written. */
export const ledgerEntries = (ledger: unknown): LedgerRecord[] => collection(ledger, "entries");

/** A mapping's `decisions:`; a bare-list ledger has none. */
export const ledgerDecisions = (ledger: unknown): LedgerRecord[] => collection(ledger, "decisions");

/** `because` has been written as a string and as a list of strings. */
export const hasReason = (because: unknown): boolean =>
  typeof because === "string"
    ? because.trim().length > 0
    : Array.isArray(because) && because.some(hasReason);

export const recordId = (record: LedgerRecord): string =>
  typeof record.id === "string" ? record.id : "(no id)";

/** A step drop: `kind: dropped`, a top-level `step`, a non-empty `because`, and no `source_arg`. */
export function isStepDrop(entry: LedgerRecord): entry is LedgerRecord & { step: string } {
  return (
    entry.kind === "dropped" &&
    typeof entry.step === "string" &&
    hasReason(entry.because) &&
    !("source_arg" in entry)
  );
}

export interface SourceArg {
  step: string;
  arg: string;
  flags?: string[];
}

/** A per-flag record's `source_arg`, when it names a step and a summary entry id. */
export function sourceArg(record: LedgerRecord): SourceArg | undefined {
  const value = record.source_arg;
  if (!isRecord(value) || typeof value.step !== "string" || typeof value.arg !== "string")
    return undefined;
  const flags = Array.isArray(value.flags)
    ? value.flags.filter((flag): flag is string => typeof flag === "string")
    : undefined;
  return { step: value.step, arg: value.arg, ...(flags ? { flags } : {}) };
}

/** Every backticked span in a drop's `units`. */
export const backticked = (units: unknown): string[] =>
  typeof units === "string" ? [...units.matchAll(/`([^`]+)`/g)].map(([, span]) => span!) : [];

/** The backticked uppercase summary names in a drop's `units`. */
export const unitNames = (units: unknown): string[] =>
  backticked(units).filter((span) => /^[A-Z][A-Z0-9_]+$/.test(span));
