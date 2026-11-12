// Shared "validate one JSON file" runner. Exit codes:
//   0 — valid
//   1 — input error (missing file, malformed JSON)
//   3 — schema-validation failure

import process from "node:process";
import { readInputOrExit } from "./read-input.js";
import type { SchemaValidator } from "./validator.js";

export function runJsonValidator(path: string, validator: SchemaValidator): never {
  const result = validator.validate(readInputOrExit(path, JSON.parse));
  if (result.valid) {
    process.stdout.write(`${path}: valid\n`);
    process.exit(0);
  }

  for (const diag of result.errors) {
    process.stderr.write(`  ${diag.path}: ${diag.message} (${diag.keyword})\n`);
  }
  process.stderr.write(`${path}: ${result.errors.length} error(s)\n`);
  process.exit(3);
}
