import YAML from "yaml";
import { exitOnInputShape, readInputOrExit } from "../lib/read-input.js";
import { assembleNextflowParity } from "../nextflow-parity.js";

export interface NextflowParityOptions {
  summary: string;
  ledger: string;
  snapshot: string;
  workflow: string;
  diff: string;
}

export function runNextflowParity(options: NextflowParityOptions): never {
  const inputs = {
    summary: readInputOrExit<unknown>(options.summary, JSON.parse),
    ledger: readInputOrExit<unknown>(options.ledger, YAML.parse),
    snapshot: readInputOrExit<unknown>(options.snapshot, YAML.parse),
    workflow: readInputOrExit<unknown>(options.workflow, YAML.parse),
    diff: readInputOrExit<unknown>(options.diff, JSON.parse),
  };
  const result = exitOnInputShape(() => assembleNextflowParity(inputs));
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exit(0);
}
