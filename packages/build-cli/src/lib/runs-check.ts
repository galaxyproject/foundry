// Schema validation of harvested sample runs.
//
// A bundle may carry `runs/<name>/summary.json` — what the skill actually produced on a real
// input, kept beside it as evidence. This checks each one against the schema the Mold declares
// for its OWN output, so a run that no longer satisfies the contract is caught at cast time
// rather than by whoever reads the bundle next.
//
// Lives outside the caster because the question is Galaxy's: it presumes artifacts, that
// artifacts carry JSON Schemas, and that a bundle keeps sample runs at all. Moving it here also
// takes Ajv out of the caster's imports, where it was the only dependency serving one branch.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import type { ErrorObject } from "ajv";
import AjvImport from "ajv";
import Ajv2020Import from "ajv/dist/2020.js";
import addFormatsImport from "ajv-formats";

import { errorMessage } from "./errors.js";

type AjvValidator = {
  compile: (schema: unknown) => ((data: unknown) => boolean) & { errors?: ErrorObject[] | null };
};
const Ajv = AjvImport as unknown as new (opts: {
  allErrors: boolean;
  strict: boolean;
}) => AjvValidator;
const Ajv2020 = Ajv2020Import as unknown as new (opts: {
  allErrors: boolean;
  strict: boolean;
}) => AjvValidator;
const addFormats = addFormatsImport as unknown as (ajv: AjvValidator) => unknown;

function loadAjvForSchema(schemaPath: string): ReturnType<AjvValidator["compile"]> {
  // Named, because the bare SyntaxError from JSON.parse says only that something somewhere was
  // not JSON — and the file it means is one the caster picked, not one the author pointed at.
  let schema: unknown;
  try {
    schema = JSON.parse(readFileSync(schemaPath, "utf8"));
  } catch (e) {
    throw new Error(`${schemaPath}: not loadable as a JSON Schema: ${errorMessage(e)}`, {
      cause: e,
    });
  }
  const schemaUri =
    schema &&
    typeof schema === "object" &&
    typeof (schema as { $schema?: unknown }).$schema === "string"
      ? (schema as { $schema: string }).$schema
      : "";
  const ajv = schemaUri.includes("2020-12")
    ? new Ajv2020({ allErrors: true, strict: false })
    : new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  return ajv.compile(schema);
}

export function validateRuns(bundleRoot: string, schemaAbs: string): string[] {
  const errors: string[] = [];
  const runsDir = path.join(bundleRoot, "runs");
  if (!existsSync(runsDir)) return errors;
  const validate = loadAjvForSchema(schemaAbs);
  for (const entry of readdirSync(runsDir)) {
    const summaryPath = path.join(runsDir, entry, "summary.json");
    if (!existsSync(summaryPath)) continue;
    const data = JSON.parse(readFileSync(summaryPath, "utf8"));
    if (!validate(data)) {
      const messages = (validate.errors ?? []).map(
        (e) => `    ${e.instancePath || "(root)"}: ${e.message}`,
      );
      errors.push(`runs/${entry}/summary.json:\n${messages.join("\n")}`);
    }
  }
  return errors;
}
