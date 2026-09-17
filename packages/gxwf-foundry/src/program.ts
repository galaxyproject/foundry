import {
  runCheckWorkflowBrief,
  type WorkflowBriefCheckOptions,
} from "./commands/check-workflow-brief.js";
import { runValidateMarkdown } from "./commands/validate-markdown.js";
import { runValidateWorkflowBrief } from "./commands/validate-workflow-brief.js";
import { Command } from "commander";
import { attachSummarizeNextflow } from "./commands/summarize-nextflow.js";
import { runValidateSummaryNextflow } from "./commands/validate-summary-nextflow.js";
import { runValidateSummaryCwl } from "./commands/validate-summary-cwl.js";
import { runValidateSummaryGalaxyWorkflow } from "./commands/validate-summary-galaxy-workflow.js";
import { runValidateGalaxyToolDiscovery } from "./commands/validate-galaxy-tool-discovery.js";
import { runValidateGalaxyToolSummary } from "./commands/validate-galaxy-tool-summary.js";
import { runValidateGalaxyWorkflowTestPlan } from "./commands/validate-galaxy-workflow-test-plan.js";
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

  program
    .command("validate-summary-nextflow")
    .description("Validate a summarize-nextflow JSON document.")
    .argument("<summary.json>")
    .action((path: string) => runValidateSummaryNextflow(path));

  program
    .command("validate-summary-cwl")
    .description("Validate a summarize-cwl JSON document.")
    .argument("<summary.json>")
    .action((path: string) => runValidateSummaryCwl(path));

  program
    .command("validate-summary-galaxy-workflow")
    .description("Validate a summarize-galaxy-workflow JSON document.")
    .argument("<summary.json>")
    .action((path: string) => runValidateSummaryGalaxyWorkflow(path));

  program
    .command("validate-galaxy-tool-discovery")
    .description("Validate a discover-shed-tool recommendation document.")
    .argument("<recommendation.json>")
    .action((path: string) => runValidateGalaxyToolDiscovery(path));

  program
    .command("validate-galaxy-tool-summary")
    .description("Validate a galaxy-tool-cache summarize manifest.")
    .argument("<manifest.json>")
    .action((path: string) => runValidateGalaxyToolSummary(path));

  program
    .command("validate-galaxy-workflow-test-plan")
    .description("Validate a Galaxy workflow test-plan YAML document.")
    .argument("<test-plan.yml>")
    .action((path: string) => runValidateGalaxyWorkflowTestPlan(path));

  program
    .command("validate-markdown")
    .description("Validate Markdown sections against a named document schema.")
    .argument("<schema>")
    .argument("<document.md>")
    .action((schema: string, path: string) => runValidateMarkdown(schema, path));

  program
    .command("validate-workflow-brief")
    .description("Validate a Workflow Brief Markdown document (experimental RFC).")
    .argument("<brief.md>")
    .action((path: string) => runValidateWorkflowBrief(path));

  program
    .command("check-workflow-brief")
    .description("Check Workflow Brief structure and explicit workflow/environment blockers.")
    .argument("<brief.md>")
    .option("--json", "Emit machine-readable structure and blocker diagnostics", false)
    .action((path: string, options: WorkflowBriefCheckOptions) =>
      runCheckWorkflowBrief(path, options),
    );

  program
    .command("validate-tests-format")
    .description(
      "Validate a Galaxy workflow tests YAML file; optionally cross-check against a workflow.",
    )
    .argument("<tests.yml>")
    .option("--workflow <path>", "Workflow file to cross-check inputs/outputs against")
    .option("--json", "Emit machine-readable JSON report", false)
    .action((path: string, opts: ValidateTestsOptions) => runValidateTestsFormat(path, opts));

  return program;
}
