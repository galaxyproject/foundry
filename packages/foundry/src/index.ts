// Public TS surface for `@galaxy-foundry/foundry`. Most users invoke the
// `foundry` bin; the library exports exist so the site (and other TS
// consumers) can import a schema or validator without shelling out.

export { summaryCwlSchema } from "./schemas/summary-cwl/summary-cwl.schema.generated.js";
export { summaryGalaxyWorkflowSchema } from "./schemas/summary-galaxy-workflow/summary-galaxy-workflow.schema.generated.js";
export { galaxyToolDiscoverySchema } from "./schemas/galaxy-tool-discovery/galaxy-tool-discovery.schema.generated.js";
export { galaxyToolSummarySchema } from "./schemas/galaxy-tool-summary/galaxy-tool-summary.schema.generated.js";
export { galaxyWorkflowTestPlanSchema } from "./schemas/galaxy-workflow-test-plan/galaxy-workflow-test-plan.schema.generated.js";
export { testsFormatSchema } from "./schemas/tests-format/tests.schema.generated.js";

export {
  createValidator,
  type SchemaDiagnostic,
  type SchemaValidationResult,
  type SchemaValidator,
} from "./lib/validator.js";

export { summaryCwlValidator } from "./commands/validate-summary-cwl.js";
export { summaryGalaxyWorkflowValidator } from "./commands/validate-summary-galaxy-workflow.js";
export { galaxyToolDiscoveryValidator } from "./commands/validate-galaxy-tool-discovery.js";
export { galaxyToolSummaryValidator } from "./commands/validate-galaxy-tool-summary.js";
export { summaryNextflowValidator } from "./commands/validate-summary-nextflow.js";
export { galaxyWorkflowTestPlanValidator } from "./commands/validate-galaxy-workflow-test-plan.js";
export { validateTestsFormat } from "./commands/validate-tests-format.js";
