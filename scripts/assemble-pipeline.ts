#!/usr/bin/env tsx

import { runAssemblePipelineCommand } from "../packages/build-cli/src/commands/assemble-pipeline.js";

runAssemblePipelineCommand().catch((e) => {
  console.error(e);
  process.exit(1);
});
