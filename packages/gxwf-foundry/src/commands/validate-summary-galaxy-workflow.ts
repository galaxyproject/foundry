import { summaryGalaxyWorkflowSchema } from "../schemas/summary-galaxy-workflow/summary-galaxy-workflow.schema.generated.js";
import { createValidator } from "../lib/validator.js";
import { runJsonValidator } from "../lib/run-json-validator.js";

export const summaryGalaxyWorkflowValidator = createValidator(
  summaryGalaxyWorkflowSchema as object,
);

export function runValidateSummaryGalaxyWorkflow(path: string): never {
  runJsonValidator(path, summaryGalaxyWorkflowValidator);
}
