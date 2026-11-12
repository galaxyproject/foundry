import YAML from "yaml";
import { readInputOrExit } from "../lib/read-input.js";
import { InputShapeError } from "../ledger.js";
import { checkStepRemovals, type StepRemovalCheck } from "../step-removals.js";

export interface StepRemovalsCheckOptions {
  json?: boolean;
}

const stdinOr = (path: string) => (path === "-" ? 0 : path);

export function runCheckStepRemovals(
  diffPath: string,
  ledgerPath: string,
  options: StepRemovalsCheckOptions,
): never {
  const diff = readInputOrExit<unknown>(diffPath, JSON.parse, stdinOr(diffPath));
  const ledger = readInputOrExit<unknown>(ledgerPath, YAML.parse, stdinOr(ledgerPath));
  let result: StepRemovalCheck;
  try {
    result = checkStepRemovals(diff, ledger);
  } catch (error) {
    if (!(error instanceof InputShapeError)) throw error;
    process.stderr.write(`${error.message}\n`);
    process.exit(3);
  }
  if (options.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    for (const step of result.unlabelled)
      process.stderr.write(
        `  removed step ${step} has no kind: dropped ledger entry naming it with a because\n`,
      );
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
