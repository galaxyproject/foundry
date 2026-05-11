import { summaryNextflowSchema } from "@galaxy-foundry/summarize-nextflow";
import { createValidator } from "../lib/validator.js";
import { runJsonValidator } from "../lib/run-json-validator.js";

export const summaryNextflowValidator = createValidator(summaryNextflowSchema as object);

export function runValidateSummaryNextflow(path: string): never {
  runJsonValidator(path, summaryNextflowValidator);
}
