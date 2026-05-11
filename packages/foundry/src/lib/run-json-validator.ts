// Shared "validate one JSON file" runner. Exit codes:
//   0 — valid
//   1 — input error (missing file, malformed JSON)
//   3 — schema-validation failure

import { readFileSync } from "node:fs";
import process from "node:process";
import type { SchemaValidator } from "./validator.js";

export function runJsonValidator(path: string, validator: SchemaValidator): never {
  let data: unknown;
  try {
    data = JSON.parse(readFileSync(path, "utf8"));
  } catch (err) {
    process.stderr.write(
      `error reading ${path}: ${err instanceof Error ? err.message : String(err)}\n`,
    );
    process.exit(1);
  }

  const result = validator.validate(data);
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
