#!/usr/bin/env node
// tsc emits only .js/.d.ts/.map; copy the JSON schema into dist for package exports.

import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = resolve(__dirname, "..");

const ASSETS = [["src/galaxy-workflow-test-plan.schema.json", "dist/galaxy-workflow-test-plan.schema.json"]];

for (const [src, dst] of ASSETS) {
  const srcPath = resolve(PKG_ROOT, src);
  const dstPath = resolve(PKG_ROOT, dst);
  mkdirSync(dirname(dstPath), { recursive: true });
  copyFileSync(srcPath, dstPath);
  console.log(`copied ${src} -> ${dst}`);
}
