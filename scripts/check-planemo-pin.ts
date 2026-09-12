#!/usr/bin/env tsx
// Gate for the planemo pin. Pure file reading — no planemo, no network — so this belongs in
// the default `make check`, unlike `check:planemo-cli` which shells out to the binary.

import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  findPlanemoPinDrift,
  PLANEMO_PIN_NOTE,
  readPinnedPlanemoVersion,
} from "./lib/planemo-pin.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const expected = readPinnedPlanemoVersion(repoRoot);
const drift = findPlanemoPinDrift(repoRoot);

for (const item of drift) {
  console.warn(`${item.file}: ${item.detail} is ${item.found}, expected ${expected}`);
}

if (drift.length) {
  console.error(
    `\n${drift.length} file(s) disagree with the pin in ${PLANEMO_PIN_NOTE}.\n` +
      `Either correct the stale copy, or — if the intent really is a new planemo — bump\n` +
      `package_version in that note and run 'make sync-planemo' with that planemo on PATH.`,
  );
  process.exit(1);
}

console.log(`planemo pin ${expected} agrees across every recorded copy.`);
