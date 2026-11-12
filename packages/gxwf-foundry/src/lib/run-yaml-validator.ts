// Shared "validate one YAML (or JSON) file" runner. YAML is a superset of
// JSON, so the same parser handles both. Exit codes mirror run-json-validator:
//   0 — valid
//   1 — input error (missing file, malformed YAML)
//   3 — schema-validation failure

import process from "node:process";
import YAML from "yaml";
import { readInputOrExit } from "./read-input.js";
import type { SchemaValidator } from "./validator.js";

export function runYamlValidator(path: string, validator: SchemaValidator): never {
  const result = validator.validate(readInputOrExit(path, YAML.parse));
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
