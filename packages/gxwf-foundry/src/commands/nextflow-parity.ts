import YAML from "yaml";
import { readInputOrExit } from "../lib/read-input.js";
import { InputShapeError } from "../ledger.js";
import { assembleNextflowParity, type NextflowParity } from "../nextflow-parity.js";

export interface NextflowParityOptions {
  summary: string;
  ledger: string;
  snapshot: string;
  workflow: string;
  diff: string;
}

export function runNextflowParity(options: NextflowParityOptions): never {
  let result: NextflowParity;
  try {
    result = assembleNextflowParity({
      summary: readInputOrExit<unknown>(options.summary, JSON.parse),
      ledger: readInputOrExit<unknown>(options.ledger, YAML.parse),
      snapshot: readInputOrExit<unknown>(options.snapshot, YAML.parse),
      workflow: readInputOrExit<unknown>(options.workflow, YAML.parse),
      diff: readInputOrExit<unknown>(options.diff, JSON.parse),
    });
  } catch (error) {
    if (!(error instanceof InputShapeError)) throw error;
    process.stderr.write(`${error.message}\n`);
    process.exit(3);
  }
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exit(0);
}
