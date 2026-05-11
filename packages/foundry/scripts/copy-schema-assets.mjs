#!/usr/bin/env node
// tsc emits only .js/.d.ts/.map; the .json schemas need a separate copy step
// to reach dist/ so the published package can resolve "./schemas/<name>.json".

import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = resolve(__dirname, "..");

const ASSETS = [
  ["src/schemas/summary-cwl/summary-cwl.schema.json", "dist/schemas/summary-cwl/summary-cwl.schema.json"],
  [
    "src/schemas/galaxy-tool-discovery/galaxy-tool-discovery.schema.json",
    "dist/schemas/galaxy-tool-discovery/galaxy-tool-discovery.schema.json",
  ],
  [
    "src/schemas/galaxy-tool-summary/galaxy-tool-summary.schema.json",
    "dist/schemas/galaxy-tool-summary/galaxy-tool-summary.schema.json",
  ],
  ["src/schemas/tests-format/tests.schema.json", "dist/schemas/tests-format/tests.schema.json"],
];

for (const [src, dst] of ASSETS) {
  const srcPath = resolve(PKG_ROOT, src);
  const dstPath = resolve(PKG_ROOT, dst);
  mkdirSync(dirname(dstPath), { recursive: true });
  copyFileSync(srcPath, dstPath);
  console.log(`copied ${src} → ${dst}`);
}
