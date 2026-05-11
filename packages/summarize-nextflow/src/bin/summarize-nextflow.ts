#!/usr/bin/env node
import { Command } from "commander";
import { writeFileSync } from "node:fs";
import {
  buildSummary,
  SummarizeNextflowNotImplementedError,
  validateSummary,
  type SummarizeNextflowOptions,
} from "../index.js";
import { VERSION } from "../version.js";

const program = new Command();

program
  .name("summarize-nextflow")
  .description("Statically introspect a Nextflow / nf-core pipeline and emit a JSON summary.")
  .version(VERSION)
  .argument("<path-or-url>", "Path to a local pipeline clone, or a git URL")
  .option("--profile <name>", "Profile to resolve config under", "test")
  .option("--pin <ref>", "Tag, branch, or commit SHA")
  .option("--out <path>", "Write JSON to this path instead of stdout")
  .option("--no-with-nextflow", "Disable Nextflow shell-out; static parse only (default: enabled)")
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
        process.stderr.write(`summarize-nextflow ${VERSION}: not yet implemented\n`);
        process.stderr.write(`  target: ${err.target}\n`);
        process.exit(err.exitCode);
      }
      throw err;
    }
  });

program.parseAsync(process.argv).catch((err) => {
  process.stderr.write(`error: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
