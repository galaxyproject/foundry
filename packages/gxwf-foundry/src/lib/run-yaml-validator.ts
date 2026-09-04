// Shared "validate one YAML (or JSON) file" runner. YAML is a superset of
// JSON, so the same parser handles both. Exit codes mirror run-json-validator:
//   0 — valid
//   1 — input error (missing file, malformed YAML)
//   3 — schema-validation failure

import { readFileSync } from "node:fs";
import process from "node:process";
import YAML from "yaml";
import type { SchemaValidator } from "./validator.js";

export function runYamlValidator(path: string, validator: SchemaValidator): never {
  let data: unknown;
  try {
    data = YAML.parse(readFileSync(path, "utf8"));
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
