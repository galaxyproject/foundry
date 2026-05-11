// AJV-backed validator factory shared by every `foundry validate-*` subcommand.
// Pure ESM; ajv/ajv-formats default-export shape requires the cast.

import type { ErrorObject, ValidateFunction } from "ajv";
import AjvImport from "ajv";
import addFormatsImport from "ajv-formats";

const Ajv = AjvImport as unknown as typeof AjvImport.default;
const addFormats = addFormatsImport as unknown as typeof addFormatsImport.default;

export interface SchemaDiagnostic {
  path: string;
  message: string;
  keyword: string;
  params: Record<string, unknown>;
}

export interface SchemaValidationResult {
  valid: boolean;
  errors: SchemaDiagnostic[];
}

export interface SchemaValidator {
  validate(data: unknown): SchemaValidationResult;
}

function toDiagnostic(err: ErrorObject): SchemaDiagnostic {
  return {
    path: err.instancePath === "" ? "(root)" : err.instancePath,
    message: err.message ?? "validation failed",
    keyword: err.keyword,
    params: (err.params ?? {}) as Record<string, unknown>,
  };
}

export function createValidator(schema: object): SchemaValidator {
  let compiled: ValidateFunction | undefined;
  return {
    validate(data: unknown): SchemaValidationResult {
      if (!compiled) {
        const ajv = new Ajv({ allErrors: true, strict: false });
        addFormats(ajv);
        compiled = ajv.compile(schema);
      }
      const valid = compiled(data);
      if (valid) return { valid: true, errors: [] };
      return { valid: false, errors: (compiled.errors ?? []).map(toDiagnostic) };
    },
  };
}
