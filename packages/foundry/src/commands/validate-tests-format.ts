// Static validation for Galaxy workflow test YAML files. Schema +
// workflow-cross-check delegate to @galaxy-tool-util/schema.

import { readFileSync } from "node:fs";
import process from "node:process";
import YAML from "yaml";
import {
  checkTestsAgainstWorkflow,
  extractWorkflowInputs,
  extractWorkflowOutputs,
  validateTestsFile,
  type TestFormatDiagnostic,
} from "@galaxy-tool-util/schema";

export interface ValidateTestsOptions {
  workflow?: string;
  json: boolean;
}

interface ValidationReport {
  valid: boolean;
  schema_valid: boolean;
  workflow_valid: boolean | null;
  schema_errors: TestFormatDiagnostic[];
  workflow_errors: TestFormatDiagnostic[];
}

function readYaml(path: string): unknown {
  return YAML.parse(readFileSync(path, "utf8"));
}

function asWorkflowRecord(data: unknown, path: string): Record<string, unknown> {
  if (data && typeof data === "object" && !Array.isArray(data))
    return data as Record<string, unknown>;
  throw new Error(`${path} must parse to a workflow object`);
}

function printDiagnostics(title: string, diagnostics: TestFormatDiagnostic[]): void {
  if (!diagnostics.length) return;
  process.stderr.write(`${title}:\n`);
  for (const diag of diagnostics) {
    process.stderr.write(`  ${diag.path}: ${diag.message} (${diag.keyword})\n`);
  }
}

export function validateTestsFormat(data: unknown): ReturnType<typeof validateTestsFile> {
  return validateTestsFile(data);
}

export function runValidateTestsFormat(testsPath: string, opts: ValidateTestsOptions): never {
  try {
    const tests = readYaml(testsPath);
    const schemaResult = validateTestsFile(tests);
    let workflowErrors: TestFormatDiagnostic[] = [];

    if (opts.workflow) {
      const workflow = asWorkflowRecord(readYaml(opts.workflow), opts.workflow);
      workflowErrors = checkTestsAgainstWorkflow(tests, {
        inputs: extractWorkflowInputs(workflow),
        outputs: extractWorkflowOutputs(workflow),
      });
    }

    const report: ValidationReport = {
      valid: schemaResult.valid && workflowErrors.length === 0,
      schema_valid: schemaResult.valid,
      workflow_valid: opts.workflow ? workflowErrors.length === 0 : null,
      schema_errors: schemaResult.errors,
      workflow_errors: workflowErrors,
    };

    if (opts.json) {
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    } else if (report.valid) {
      process.stdout.write(`${testsPath}: valid\n`);
    } else {
      printDiagnostics("schema errors", report.schema_errors);
      printDiagnostics("workflow errors", report.workflow_errors);
      process.stderr.write(`${testsPath}: invalid\n`);
    }

    process.exit(report.valid ? 0 : 3);
  } catch (err) {
    process.stderr.write(`error: ${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(1);
  }
}
