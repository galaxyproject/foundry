import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { resolveNextflowSummary } from "./resolver.js";

export { VERSION } from "./version.js";
export { summaryNextflowSchema } from "./schema/summary-nextflow.schema.generated.js";
export {
  validateSummary,
  type SummaryDiagnostic,
  type SummaryValidationResult,
} from "./schema/validate.js";

function readVendoredSchema(filename: string): Record<string, unknown> {
  // dist/ layout copies the JSON beside the .js; src/ layout reads it from the
  // sibling schema/nf-core-meta/ dir. import.meta.dirname resolves to whichever
  // is current at runtime.
  const packaged = resolve(import.meta.dirname, "schema/nf-core-meta", filename);
  const src = resolve(import.meta.dirname, "..", "src/schema/nf-core-meta", filename);
  const path = existsSync(packaged) ? packaged : src;
  return JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
}

export const nfCoreModuleMetaSchema = readVendoredSchema("nf-core-module-meta.schema.json");
export const nfCoreSubworkflowMetaSchema = readVendoredSchema(
  "nf-core-subworkflow-meta.schema.json",
);
export const nextflowParametersMetaSchema = readVendoredSchema(
  "nextflow-parameters-meta.schema.json",
);

export interface SummarizeNextflowOptions {
  profile: string;
  pin?: string;
  out?: string;
  withNextflow: boolean;
  fetchTestData: boolean;
  testDataDir?: string;
  mulledIndexPath?: string;
  validate: boolean;
}

export class SummarizeNextflowNotImplementedError extends Error {
  readonly exitCode = 64;

  constructor(readonly target: string) {
    super("summarize-nextflow build is not yet implemented");
    this.name = "SummarizeNextflowNotImplementedError";
  }
}

export async function buildSummary(
  pathOrUrl: string,
  options: SummarizeNextflowOptions,
): Promise<unknown> {
  if (/^https?:\/\//u.test(pathOrUrl) || options.pin) {
    throw new SummarizeNextflowNotImplementedError(pathOrUrl);
  }
  return resolveNextflowSummary(pathOrUrl, {
    profile: options.profile,
    withNextflow: options.withNextflow,
    fetchTestData: options.fetchTestData,
    testDataDir: options.testDataDir,
    mulledIndexPath: options.mulledIndexPath,
  });
}
