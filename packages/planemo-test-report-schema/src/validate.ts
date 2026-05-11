import type { ErrorObject, ValidateFunction } from "ajv";
import AjvImport from "ajv/dist/2020.js";
import addFormatsImport from "ajv-formats";
import { planemoTestReportSchema } from "./test-report.schema.generated.js";

const Ajv2020 = AjvImport as unknown as typeof AjvImport.default;
const addFormats = addFormatsImport as unknown as typeof addFormatsImport.default;

export interface PlanemoTestReportDiagnostic {
  path: string;
  message: string;
  keyword: string;
  params: Record<string, unknown>;
}

export interface PlanemoTestReportValidationResult {
  valid: boolean;
  errors: PlanemoTestReportDiagnostic[];
}

let _validator: ValidateFunction | undefined;

function getValidator(): ValidateFunction {
  if (!_validator) {
    const ajv = new Ajv2020({ allErrors: true, strict: false });
    addFormats(ajv);
    _validator = ajv.compile(planemoTestReportSchema as object);
  }
  return _validator;
}

function toDiagnostic(err: ErrorObject): PlanemoTestReportDiagnostic {
  return {
    path: err.instancePath === "" ? "(root)" : err.instancePath,
    message: err.message ?? "validation failed",
    keyword: err.keyword,
    params: (err.params ?? {}) as Record<string, unknown>,
  };
}

export function validatePlanemoTestReport(data: unknown): PlanemoTestReportValidationResult {
  const validate = getValidator();
  const valid = validate(data);
  if (valid) return { valid: true, errors: [] };
  return { valid: false, errors: (validate.errors ?? []).map(toDiagnostic) };
}
