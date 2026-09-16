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
  program.parse();
} catch (error) {
  process.stderr.write(
    `nfcore-tool-lab: ${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exitCode = 1;
}
