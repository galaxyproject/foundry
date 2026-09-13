// Runs every committed artifact fixture through the validator its Mold's cast
// bundle declares. See scripts/lib/artifact-fixtures.ts for why.

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildValidatorRegistry,
  findFixtures,
  resolveValidatorSource,
} from "./lib/artifact-fixtures";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const registry = buildValidatorRegistry(repoRoot);
if (registry.size === 0) {
  console.error("No cast bundle declares a deterministic validator; nothing to check.");
  process.exit(2);
}

const tsx = path.join(repoRoot, "node_modules", ".bin", "tsx");
if (!fs.existsSync(tsx)) {
  console.error("tsx not found; run `pnpm install` first.");
  process.exit(2);
}

const binCache = new Map<string, string>();
const failures: string[] = [];
const exercised = new Set<string>();
const fixtures = findFixtures(repoRoot, registry);

for (const { file, spec } of fixtures) {
  let source = binCache.get(spec.bin);
  if (!source) {
    source = resolveValidatorSource(repoRoot, spec.bin);
    binCache.set(spec.bin, source);
  }
  const args = spec.args.map((arg) => arg.replace("{artifact_path}", file));
  const result = spawnSync(tsx, [source, ...args], { cwd: repoRoot, encoding: "utf-8" });
  exercised.add(spec.artifactId);

  if (result.status !== 0) {
    const detail = [result.stdout, result.stderr].filter(Boolean).join("\n").trimEnd();
    failures.push(
      `${file}\n  ${spec.bin} ${args.join(" ")} exited ${result.status}\n` +
        detail
          .split("\n")
          .map((line) => `    ${line}`)
          .join("\n"),
    );
  }
}

const declared = new Set([...registry.values()].map((spec) => spec.artifactId));
const unexercised = [...declared].filter((id) => !exercised.has(id)).sort();

if (failures.length) {
  for (const failure of failures) console.error(failure);
  console.error(
    `\n${failures.length} of ${fixtures.length} artifact fixtures failed the validator their Mold declares.`,
  );
  console.error("Fix the fixture; do not relax the schema to accept it.");
  process.exit(1);
}

console.log(
  `Checked ${fixtures.length} artifact fixture(s) against ${declared.size} declared validator(s); all valid.`,
);
// Reported, not failed: a Mold may legitimately ship no example yet. Silence
// here would let the gate shrink to nothing without anyone noticing.
if (unexercised.length) {
  console.log(`No committed fixture exercises: ${unexercised.join(", ")}`);
}
