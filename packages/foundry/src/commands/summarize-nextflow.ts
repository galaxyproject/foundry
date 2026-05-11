// Wraps `@galaxy-foundry/summarize-nextflow` as a foundry subcommand.
// Same surface as the standalone `summarize-nextflow` bin; adds nothing
// today beyond co-located distribution. Validation runs against the
// summarize-nextflow package's own schema, not a foundry-owned mirror.

import type { Command } from "commander";
import { writeFileSync } from "node:fs";
import {
  buildSummary,
  SummarizeNextflowNotImplementedError,
  validateSummary,
  type SummarizeNextflowOptions,
} from "@galaxy-foundry/summarize-nextflow";

export function attachSummarizeNextflow(parent: Command): void {
  parent
    .command("summarize-nextflow")
    .description("Statically introspect a Nextflow / nf-core pipeline and emit a JSON summary.")
    .argument("<path-or-url>", "Path to a local pipeline clone, or a git URL")
    .option("--profile <name>", "Profile to resolve config under", "test")
    .option("--pin <ref>", "Tag, branch, or commit SHA")
    .option("--out <path>", "Write JSON to this path instead of stdout")
    .option(
      "--no-with-nextflow",
      "Disable Nextflow shell-out; static parse only (default: enabled)",
    )
    .option("--fetch-test-data", "Resolve and hash referenced test data", false)
    .option("--test-data-dir <path>", "Write fetched test data under this directory")
    .option("--mulled-index-path <path>", "Cached BioContainers multi-package-containers TSV")
    .option("--no-validate", "Skip schema validation of the emitted summary (default: enabled)")
    .action(async (pathOrUrl: string, options: SummarizeNextflowOptions) => {
      try {
        const summary = await buildSummary(pathOrUrl, options);
        if (options.validate) {
          const result = validateSummary(summary);
          if (!result.valid) {
            for (const diag of result.errors) {
              process.stderr.write(`  ${diag.path}: ${diag.message} (${diag.keyword})\n`);
            }
            process.exit(3);
          }
        }
        const json = `${JSON.stringify(summary, null, 2)}\n`;
        if (options.out) writeFileSync(options.out, json);
        else process.stdout.write(json);
      } catch (err) {
        if (err instanceof SummarizeNextflowNotImplementedError) {
          process.stderr.write(`summarize-nextflow: not yet implemented\n`);
          process.stderr.write(`  target: ${err.target}\n`);
          process.exit(err.exitCode);
        }
        throw err;
      }
    });
}
