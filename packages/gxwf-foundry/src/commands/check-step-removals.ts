import YAML from "yaml";
import { readInputOrExit } from "../lib/read-input.js";
import {
  checkStepRemovals,
  StepRemovalInputError,
  type StepRemovalCheck,
} from "../step-removals.js";

export interface StepRemovalsCheckOptions {
  json?: boolean;
}

export function runCheckStepRemovals(
  diffPath: string,
  ledgerPath: string,
  options: StepRemovalsCheckOptions,
): never {
  const diff = readInputOrExit<unknown>(diffPath, JSON.parse);
  const ledger = readInputOrExit<unknown>(ledgerPath, YAML.parse);
  let result: StepRemovalCheck;
  try {
    result = checkStepRemovals(diff, ledger);
  } catch (error) {
    if (!(error instanceof StepRemovalInputError)) throw error;
    process.stderr.write(`${error.message}\n`);
    process.exit(3);
  }
  if (options.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    for (const step of result.unlabelled)
      process.stderr.write(`  removed step ${step} has no kind: dropped ledger entry naming it\n`);
    if (result.unwired_inputs.length > 0)
      process.stdout.write(`inputs feeding no step: ${result.unwired_inputs.join(", ")}\n`);
    const removed = result.removed_steps.length;
    const message = result.ok
      ? `${removed} removed step(s), all labelled\n`
      : `${result.unlabelled.length} of ${removed} removed step(s) unlabelled\n`;
    (result.ok ? process.stdout : process.stderr).write(message);
  }
  process.exit(result.ok ? 0 : 4);
}
