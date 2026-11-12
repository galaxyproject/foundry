import YAML from "yaml";
import { exitOnInputShape, readInputOrExit } from "../lib/read-input.js";
import { checkScopeRecords, type ScopeSummary } from "../scope-records.js";

export interface ScopeRecordsCheckOptions {
  json?: boolean;
}

export function runCheckScopeRecords(
  ledgerPath: string,
  summaryPath: string | undefined,
  options: ScopeRecordsCheckOptions,
): never {
  const ledger = readInputOrExit<unknown>(ledgerPath, YAML.parse);
  const summary =
    summaryPath === undefined ? undefined : readInputOrExit<ScopeSummary>(summaryPath, JSON.parse);
  const result = exitOnInputShape(() => checkScopeRecords(ledger, summary));
  if (options.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    for (const { record, problem } of result.problems)
      process.stderr.write(`  ${record}: ${problem}\n`);
    const message = result.decision
      ? `scope ${result.decision.id}: ${result.drops.length} scope drop(s), ${result.problems.length} problem(s)\n`
      : `no scope decision, ${result.problems.length} problem(s)\n`;
    (result.ok ? process.stdout : process.stderr).write(message);
  }
  process.exit(result.ok ? 0 : 4);
}
