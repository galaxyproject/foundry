// AJV-backed validator for Galaxy workflow test-plan handoffs.

import type { ErrorObject, ValidateFunction } from "ajv";
import AjvImport from "ajv";
import addFormatsImport from "ajv-formats";
import { galaxyWorkflowTestPlanSchema } from "./galaxy-workflow-test-plan.schema.generated.js";

const Ajv = AjvImport as unknown as typeof AjvImport.default;
const addFormats = addFormatsImport as unknown as typeof addFormatsImport.default;

export interface GalaxyWorkflowTestPlanDiagnostic {
  path: string;
  message: string;
  keyword: string;
  params: Record<string, unknown>;
}

export interface GalaxyWorkflowTestPlanValidationResult {
  valid: boolean;
  errors: GalaxyWorkflowTestPlanDiagnostic[];
}

let validator: ValidateFunction | undefined;

function getValidator(): ValidateFunction {
  if (!validator) {
    const ajv = new Ajv({ allErrors: true, strict: false });
    addFormats(ajv);
    validator = ajv.compile(galaxyWorkflowTestPlanSchema as object);
  }
  return validator;
}

function toDiagnostic(err: ErrorObject): GalaxyWorkflowTestPlanDiagnostic {
  return {
    path: err.instancePath === "" ? "(root)" : err.instancePath,
    message: err.message ?? "validation failed",
    keyword: err.keyword,
    params: (err.params ?? {}) as Record<string, unknown>,
  };
}

export function validateGalaxyWorkflowTestPlan(
  data: unknown,
): GalaxyWorkflowTestPlanValidationResult {
  const validate = getValidator();
  const valid = validate(data);
  if (valid) return { valid: true, errors: [] };
  return { valid: false, errors: (validate.errors ?? []).map(toDiagnostic) };
}
