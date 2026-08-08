#!/usr/bin/env node

import process from "node:process";
import { runAssemblePipelineCommand } from "../commands/assemble-pipeline.js";
import { runCastMoldCommand } from "../commands/cast-mold.js";
import { runCastSweepCommand } from "../commands/cast-sweep.js";
import { runGenerateDashboardCommand } from "../commands/generate-dashboard.js";
import { runGenerateIndexCommand } from "../commands/generate-index.js";
import { runGenerateKindManifestCommand } from "../commands/generate-kind-manifest.js";
import { runGenerateReadmeStatsCommand } from "../commands/generate-readme-stats.js";
import { runValidateArtifactCommand } from "../commands/validate-artifact.js";
import { runValidateCommand } from "../commands/validate.js";

const COMMANDS = [
  "validate",
  "generate-index",
  "generate-dashboard",
  "generate-kinds",
  "generate-readme",
  "cast",
  "cast-all",
  "assemble-pipeline",
  "validate-artifact",
] as const;

async function main(argv = process.argv.slice(2)): Promise<void> {
  const [command, ...rest] = argv;
  if (!command || command === "--help" || command === "-h") {
    printHelp();
    process.exit(command ? 0 : 1);
  }

  if (command === "validate") runValidateCommand(rest);
  else if (command === "generate-index") runGenerateIndexCommand(rest);
  else if (command === "generate-dashboard") runGenerateDashboardCommand(rest);
  else if (command === "generate-kinds") runGenerateKindManifestCommand(rest);
  else if (command === "generate-readme") runGenerateReadmeStatsCommand(rest);
  else if (command === "cast") await runCastMoldCommand(rest);
  else if (command === "cast-all") await runCastSweepCommand(rest);
  else if (command === "assemble-pipeline") await runAssemblePipelineCommand(rest);
  else if (command === "validate-artifact") runValidateArtifactCommand(rest);
  else {
    process.stderr.write(`unknown command: ${command}\n\n`);
    printHelp();
    process.exit(2);
  }
}

function printHelp(): void {
  process.stdout.write(`foundry-build <command> [options]\n\nCommands:\n`);
  for (const command of COMMANDS) process.stdout.write(`  ${command}\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
