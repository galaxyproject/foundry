#!/usr/bin/env node

import { runValidateArtifactCommand } from "../commands/validate-artifact.js";

try {
  runValidateArtifactCommand();
} catch (e) {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
}
