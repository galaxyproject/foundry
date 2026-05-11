import { Command } from "commander";
import { attachSummarizeNextflow } from "./commands/summarize-nextflow.js";
import { runValidateSummaryNextflow } from "./commands/validate-summary-nextflow.js";
import { runValidateSummaryCwl } from "./commands/validate-summary-cwl.js";
import { runValidateGalaxyToolDiscovery } from "./commands/validate-galaxy-tool-discovery.js";
import { runValidateGalaxyToolSummary } from "./commands/validate-galaxy-tool-summary.js";
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
