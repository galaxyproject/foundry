#!/usr/bin/env node
// tsc emits only .js/.d.ts/.map; copy the canonical schema into dist/.

import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = resolve(__dirname, "..");

const srcPath = resolve(PKG_ROOT, "src/summary-cwl.schema.json");
const dstPath = resolve(PKG_ROOT, "dist/summary-cwl.schema.json");
mkdirSync(dirname(dstPath), { recursive: true });
copyFileSync(srcPath, dstPath);
console.log(`copied ${srcPath} -> dist/summary-cwl.schema.json`);
