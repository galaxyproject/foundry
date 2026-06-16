import { galaxyWorkflowTestPlanSchema } from "../schemas/galaxy-workflow-test-plan/galaxy-workflow-test-plan.schema.generated.js";
import { createValidator } from "../lib/validator.js";
import { runYamlValidator } from "../lib/run-yaml-validator.js";

export const galaxyWorkflowTestPlanValidator = createValidator(
  galaxyWorkflowTestPlanSchema as object,
);

export function runValidateGalaxyWorkflowTestPlan(path: string): never {
  runYamlValidator(path, galaxyWorkflowTestPlanValidator);
}
