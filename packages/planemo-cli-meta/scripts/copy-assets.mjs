#!/usr/bin/env node
// tsc emits only .js/.d.ts/.map; copy the canonical JSON artifacts into dist/.

import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = resolve(__dirname, "..");

for (const filename of ["cli-meta.json", "cli-meta.provenance.json"]) {
  const srcPath = resolve(PKG_ROOT, "src", filename);
  const dstPath = resolve(PKG_ROOT, "dist", filename);
  mkdirSync(dirname(dstPath), { recursive: true });
  copyFileSync(srcPath, dstPath);
  console.log(`copied ${srcPath} -> dist/${filename}`);
}
