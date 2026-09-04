#!/usr/bin/env node
import { buildProgram } from "../program.js";

buildProgram()
  .parseAsync(process.argv)
  .catch((err) => {
    process.stderr.write(`error: ${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(1);
  });
