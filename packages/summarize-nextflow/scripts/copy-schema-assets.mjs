#!/usr/bin/env node
// tsc emits only .js/.d.ts/.map; the .json schemas need a separate copy step
// to reach dist/ so the published package can resolve them at runtime.

import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = resolve(__dirname, "..");

const ASSETS = [
  ["src/schema/summary-nextflow.schema.json", "dist/schema/summary-nextflow.schema.json"],
  [
    "src/schema/nf-core-meta/nf-core-module-meta.schema.json",
    "dist/schema/nf-core-meta/nf-core-module-meta.schema.json",
  ],
  [
    "src/schema/nf-core-meta/nf-core-subworkflow-meta.schema.json",
    "dist/schema/nf-core-meta/nf-core-subworkflow-meta.schema.json",
  ],
  [
    "src/schema/nf-core-meta/nextflow-parameters-meta.schema.json",
    "dist/schema/nf-core-meta/nextflow-parameters-meta.schema.json",
  ],
];

for (const [src, dst] of ASSETS) {
  const srcPath = resolve(PKG_ROOT, src);
  const dstPath = resolve(PKG_ROOT, dst);
  mkdirSync(dirname(dstPath), { recursive: true });
  copyFileSync(srcPath, dstPath);
  console.log(`copied ${src} → ${dst}`);
}
