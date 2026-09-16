#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { Command } from "commander";

import { packageVersion, prepareLabTool, type LabMetadata } from "../index.js";

const program = new Command()
  .name("nfcore-tool-lab")
  .version(packageVersion)
  .description(
    "Prepare a converted nf-core Galaxy tool for tools-iwc-lab; no agent or GitHub writes.",
  );
program
  .command("stage")
  .description("Prepare and validate a draft-PR payload; no GitHub writes or deployment")
  .requiredOption("--input <directory>", "Converted tool directory")
  .requiredOption("--output <directory>", "New staging directory; never overwritten")
  .requiredOption("--metadata <file>", "Lab metadata JSON")
  .requiredOption("--destination <directory>", "Read-only local tools-iwc-lab snapshot")
  .requiredOption("--cast-bundle <directory>", "Exact converter bundle used by the worker")
  .requiredOption("--conversion-run <file>", "Local conversion harness run.json")
  .option("--review <file>", "Hash-bound licensing and upstream-case coverage review JSON")
  .option("--tool-file <filename>", "Source wrapper filename", "tool.xml")
  .option(
    "--asset <path>",
    "Explicit asset to include; repeatable",
    (value: string, previous: string[]) => [...previous, value],
    [],
  )
  .option(
    "--planemo <executable>",
    "Planemo executable (must match the report-schema pin)",
    "planemo",
  )
  .option("--timeout-ms <milliseconds>", "Per-command timeout", "1800000")
  .option("--galaxy-root <directory>", "Local development Galaxy; otherwise install release_26.1")
  .option("--galaxy-python-version <version>", "Galaxy Python version (3.11 or 3.12)", "3.11")
  .option("--conda-prefix <directory>", "Explicit dependency cache for local Galaxy tests")
  .action(
    async (options: {
      input: string;
      output: string;
      metadata: string;
      destination: string;
      castBundle: string;
      conversionRun: string;
      review?: string;
      toolFile: string;
      asset: string[];
      planemo: string;
      timeoutMs: string;
      galaxyRoot?: string;
      galaxyPythonVersion: "3.11" | "3.12";
      condaPrefix?: string;
    }) => {
      const { stageLabTool } = await import("../stage.js");
      const controller = new AbortController();
      const cancel = () => controller.abort();
      process.on("SIGINT", cancel);
      process.on("SIGTERM", cancel);
      try {
        const report = await stageLabTool({
          inputDir: options.input,
          outputDir: options.output,
          metadata: JSON.parse(readFileSync(options.metadata, "utf8")) as LabMetadata,
          destinationDir: options.destination,
          castBundleDir: options.castBundle,
          conversionRunFile: options.conversionRun,
          reviewFile: options.review,
          toolFilename: options.toolFile,
          assets: options.asset,
          planemoCommand: [options.planemo],
          timeoutMs: Number(options.timeoutMs),
          galaxyRoot: options.galaxyRoot,
          galaxyPythonVersion: options.galaxyPythonVersion,
          condaPrefix: options.condaPrefix,
          signal: controller.signal,
        });
        process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
        if (!report.ready_for_draft_pr) process.exitCode = 1;
      } finally {
        process.removeListener("SIGINT", cancel);
        process.removeListener("SIGTERM", cancel);
      }
    },
  );
program
  .command("prepare")
  .requiredOption(
    "--input <directory>",
    "Converted directory (tool.xml, macros.xml, _provenance.yml)",
  )
  .requiredOption(
    "--output <directory>",
    "New output directory; existing paths are never overwritten",
  )
  .requiredOption("--metadata <file>", "JSON with description, categories, and homepage_url")
  .option("--tool-file <filename>", "Source wrapper filename", "tool.xml")
  .option(
    "--asset <path>",
    "Explicit relative asset file/directory to copy; repeatable",
    (value: string, previous: string[]) => [...previous, value],
    [],
  )
  .option("--dry-run", "Validate inputs and print the publication record without writing files")
  .action(
    (options: {
      input: string;
      output: string;
      metadata: string;
      toolFile: string;
      asset: string[];
      dryRun?: boolean;
    }) => {
      const metadata = JSON.parse(readFileSync(options.metadata, "utf8")) as LabMetadata;
      const record = prepareLabTool({
        inputDir: options.input,
        outputDir: options.output,
        metadata,
        toolFilename: options.toolFile,
        assets: options.asset,
        dryRun: options.dryRun,
      });
      process.stdout.write(`${JSON.stringify(record, null, 2)}\n`);
    },
  );
try {
  await program.parseAsync();
} catch (error) {
  process.stderr.write(
    `nfcore-tool-lab: ${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exitCode = 1;
}
