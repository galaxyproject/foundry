#!/usr/bin/env node
// Shell out to `planemo output_schema --schema test-report`, unwrap the envelope,
// and write src/test-report.schema.json + src/test-report.provenance.json.
//
// Requires `planemo` on PATH (or PLANEMO_BIN env). The pinned planemo version is
// recorded in content/cli/planemo/index.md; install it with:
//
//   uvx --from planemo==0.75.44 planemo --version
//
// This script is NOT run on every build — it is opt-in regeneration. The .ts
// mirrors are produced from the JSON by scripts/sync-schema.mjs, which runs in
// prebuild without needing planemo.

import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = resolve(__dirname, "..");

const SCHEMA_NAME = "test-report";
const PLANEMO_BIN = process.env.PLANEMO_BIN ?? "planemo";
const DST_SCHEMA = resolve(PKG_ROOT, "src/test-report.schema.json");
const DST_PROVENANCE = resolve(PKG_ROOT, "src/test-report.provenance.json");

const PIN = {
  repo: "galaxyproject/planemo",
  release: "0.75.44",
  note: "Released on PyPI; includes merged PR galaxyproject/planemo#1636.",
};

const result = spawnSync(PLANEMO_BIN, ["output_schema", "--schema", SCHEMA_NAME], {
  encoding: "utf8",
});

if (result.error) {
  process.stderr.write(
    `error: failed to invoke '${PLANEMO_BIN}': ${result.error.message}\n` +
      `Install the pinned planemo:\n` +
      `  uvx --from planemo==${PIN.release} planemo --version\n`,
  );
  process.exit(1);
}
if (result.status !== 0) {
  process.stderr.write(`${PLANEMO_BIN} exited ${result.status}\n${result.stderr}`);
  process.exit(result.status ?? 1);
}

let envelope;
try {
  envelope = JSON.parse(result.stdout);
} catch (err) {
  process.stderr.write(
    `error: failed to parse planemo stdout as JSON: ${err instanceof Error ? err.message : String(err)}\n`,
  );
  process.exit(1);
}

const schema = envelope?.schemas?.[SCHEMA_NAME];
if (!schema) {
  process.stderr.write(`error: planemo envelope missing schemas.${SCHEMA_NAME}\n`);
  process.exit(1);
}

const provenance = {
  planemo_version: envelope.planemo_version ?? "unknown",
  schema_name: SCHEMA_NAME,
  schema_version: envelope.schema_version ?? "unknown",
  source: {
    note: PIN.note,
    release: PIN.release,
    repo: PIN.repo,
  },
};

writeFileSync(DST_SCHEMA, JSON.stringify(schema, null, 2) + "\n");
writeFileSync(DST_PROVENANCE, JSON.stringify(provenance, null, 2) + "\n");

console.log(`synced ${DST_SCHEMA}`);
console.log(`synced ${DST_PROVENANCE}`);
console.log(`planemo_version=${provenance.planemo_version}`);
console.log(`Run 'pnpm sync' to regenerate the TS mirrors.`);
