import {
  runCheckWorkflowBrief,
  type WorkflowBriefCheckOptions,
} from "./commands/check-workflow-brief.js";
import { runValidateMarkdown } from "./commands/validate-markdown.js";
import { runValidateWorkflowBrief } from "./commands/validate-workflow-brief.js";
import { Command } from "commander";
import { summaryNextflowSchema } from "@galaxy-foundry/summarize-nextflow";
import { testsSchema } from "@galaxy-tool-util/schema";
import {
  galaxyToolDiscoverySchema,
  galaxyToolSummarySchema,
  galaxyWorkflowTestPlanSchema,
  summaryCwlSchema,
  summaryGalaxyWorkflowSchema,
  testDataRefsSchema,
  workflowBriefSchema,
} from "./index.js";
import { attachSchemaPin } from "./lib/schema-pin.js";
import { attachSummarizeNextflow } from "./commands/summarize-nextflow.js";
import { runValidateSummaryNextflow } from "./commands/validate-summary-nextflow.js";
import { runValidateSummaryCwl } from "./commands/validate-summary-cwl.js";
import { runValidateSummaryGalaxyWorkflow } from "./commands/validate-summary-galaxy-workflow.js";
import { runValidateGalaxyToolDiscovery } from "./commands/validate-galaxy-tool-discovery.js";
import { runValidateGalaxyToolSummary } from "./commands/validate-galaxy-tool-summary.js";
import { runValidateGalaxyWorkflowTestPlan } from "./commands/validate-galaxy-workflow-test-plan.js";
import { runValidateTestDataRefs } from "./commands/validate-test-data-refs.js";
import {
  runValidateTestsFormat,
  type ValidateTestsOptions,
} from "./commands/validate-tests-format.js";

export function buildProgram(): Command {
  const program = new Command();

  program
    .name("foundry")
    .description(
      "Galaxy Workflow Foundry CLI — produce and validate Mold IO artifacts (summaries, recommendations, test files).",
    );

  attachSummarizeNextflow(program);

  attachSchemaPin(
    program
      .command("validate-summary-nextflow")
      .description("Validate a summarize-nextflow JSON document.")
      .argument("[summary.json]"),
    "summary-nextflow",
    summaryNextflowSchema,
  ).action((path: string) => runValidateSummaryNextflow(path));

  attachSchemaPin(
    program
      .command("validate-summary-cwl")
      .description("Validate a summarize-cwl JSON document.")
      .argument("[summary.json]"),
    "summary-cwl",
    summaryCwlSchema,
  ).action((path: string) => runValidateSummaryCwl(path));

  attachSchemaPin(
    program
      .command("validate-summary-galaxy-workflow")
      .description("Validate a summarize-galaxy-workflow JSON document.")
      .argument("[summary.json]"),
    "summary-galaxy-workflow",
    summaryGalaxyWorkflowSchema,
  ).action((path: string) => runValidateSummaryGalaxyWorkflow(path));

  attachSchemaPin(
    program
      .command("validate-galaxy-tool-discovery")
      .description("Validate a discover-shed-tool recommendation document.")
      .argument("[recommendation.json]"),
    "galaxy-tool-discovery",
    galaxyToolDiscoverySchema,
  ).action((path: string) => runValidateGalaxyToolDiscovery(path));

  attachSchemaPin(
    program
      .command("validate-galaxy-tool-summary")
      .description("Validate a galaxy-tool-cache summarize manifest.")
      .argument("[manifest.json]"),
    "galaxy-tool-summary",
    galaxyToolSummarySchema,
  ).action((path: string) => runValidateGalaxyToolSummary(path));

  attachSchemaPin(
    program
      .command("validate-galaxy-workflow-test-plan")
      .description("Validate a Galaxy workflow test-plan YAML document.")
      .argument("[test-plan.yml]"),
    "galaxy-workflow-test-plan",
    galaxyWorkflowTestPlanSchema,
  ).action((path: string) => runValidateGalaxyWorkflowTestPlan(path));

  attachSchemaPin(
    program
      .command("validate-test-data-refs")
      .description("Validate a test-data-refs JSON document.")
      .argument("[test-data-refs.json]"),
    "test-data-refs",
    testDataRefsSchema,
  ).action((path: string) => runValidateTestDataRefs(path));

  program
    .command("validate-markdown")
    .description("Validate Markdown sections against a named document schema.")
    .argument("<schema>")
    .argument("<document.md>")
    .action((schema: string, path: string) => runValidateMarkdown(schema, path));

  attachSchemaPin(
    program
      .command("validate-workflow-brief")
      .description("Validate a Workflow Brief Markdown document (experimental RFC).")
      .argument("[brief.md]"),
    "workflow-brief",
    workflowBriefSchema,
  ).action((path: string) => runValidateWorkflowBrief(path));

  program
    .command("check-workflow-brief")
    .description("Check Workflow Brief structure and explicit workflow/environment blockers.")
    .argument("<brief.md>")
    .option("--json", "Emit machine-readable structure and blocker diagnostics", false)
    .action((path: string, options: WorkflowBriefCheckOptions) =>
      runCheckWorkflowBrief(path, options),
    );

  attachSchemaPin(
    program
      .command("validate-tests-format")
      .description(
        "Validate a Galaxy workflow tests YAML file; optionally cross-check against a workflow.",
      )
      .argument("[tests.yml]"),
    "tests-format",
    // validateTestsFile compiles upstream's schema, not Foundry's snapshot.
    testsSchema,
  )
    .option("--workflow <path>", "Workflow file to cross-check inputs/outputs against")
    .option("--json", "Emit machine-readable JSON report", false)
    .action((path: string, opts: ValidateTestsOptions) => runValidateTestsFormat(path, opts));

  return program;
}
