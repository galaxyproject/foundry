import { readFileSync } from "node:fs";
import YAML from "yaml";
import { checkStepRemovals, StepRemovalInputError } from "../step-removals.js";

export interface StepRemovalsCheckOptions {
  json?: boolean;
}

function readInput(path: string, parse: (text: string) => unknown): unknown {
  try {
    return parse(readFileSync(path === "-" ? 0 : path, "utf8"));
  } catch (error) {
    process.stderr.write(
      `error reading ${path}: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exit(1);
  }
}

export function runCheckStepRemovals(
  diffPath: string,
  ledgerPath: string,
  options: StepRemovalsCheckOptions,
): never {
  const diff = readInput(diffPath, JSON.parse);
  const ledger = readInput(ledgerPath, YAML.parse);
  let result;
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
