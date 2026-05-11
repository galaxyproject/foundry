// AJV-backed validator for summarize-nextflow output.
// Pure ESM; ajv/ajv-formats default-export shape requires the cast.

import type { ErrorObject, ValidateFunction } from "ajv";
import AjvImport from "ajv";
import addFormatsImport from "ajv-formats";
import { summaryNextflowSchema } from "./summary-nextflow.schema.generated.js";

const Ajv = AjvImport as unknown as typeof AjvImport.default;
const addFormats = addFormatsImport as unknown as typeof addFormatsImport.default;

export interface SummaryDiagnostic {
  path: string;
  message: string;
  keyword: string;
  params: Record<string, unknown>;
}

export interface SummaryValidationResult {
  valid: boolean;
  errors: SummaryDiagnostic[];
}

let _validator: ValidateFunction | undefined;

function getValidator(): ValidateFunction {
  if (!_validator) {
    const ajv = new Ajv({ allErrors: true, strict: false });
    addFormats(ajv);
    _validator = ajv.compile(summaryNextflowSchema as object);
  }
  return _validator;
}

function toDiagnostic(err: ErrorObject): SummaryDiagnostic {
  return {
    path: err.instancePath === "" ? "(root)" : err.instancePath,
    message: err.message ?? "validation failed",
    keyword: err.keyword,
    params: (err.params ?? {}) as Record<string, unknown>,
  };
}

export function validateSummary(data: unknown): SummaryValidationResult {
  const validate = getValidator();
  const valid = validate(data);
  if (valid) return { valid: true, errors: [] };
  return { valid: false, errors: (validate.errors ?? []).map(toDiagnostic) };
}
