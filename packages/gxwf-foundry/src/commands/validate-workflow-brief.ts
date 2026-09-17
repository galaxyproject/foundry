import { workflowBriefSchema } from "../schemas/workflow-brief/workflow-brief.schema.generated.js";
import { createValidator } from "../lib/validator.js";
import { runYamlValidator } from "../lib/run-yaml-validator.js";

export const workflowBriefValidator = createValidator(workflowBriefSchema as object);

export function runValidateWorkflowBrief(path: string): never {
  runYamlValidator(path, workflowBriefValidator);
}
