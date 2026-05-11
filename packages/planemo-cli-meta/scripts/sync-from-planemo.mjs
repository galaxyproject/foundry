#!/usr/bin/env node
// Shell out to `planemo cli_metadata` (no --command, whole tree), strip
// param/help bloat, and write src/cli-meta.json + src/cli-meta.provenance.json.
//
// Requires `planemo` on PATH (or PLANEMO_BIN env). The pinned planemo SHA is
// recorded in content/cli/planemo/index.md; install it with:
//
//   uvx --from git+https://github.com/jmchilton/planemo@<sha> planemo --version
//
// This script is NOT run on every build — it is opt-in regeneration. The .ts
// mirror is produced from the JSON by scripts/sync-meta.mjs, which runs in
// prebuild without needing planemo.

import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = resolve(__dirname, "..");

const PLANEMO_BIN = process.env.PLANEMO_BIN ?? "planemo";
const PLANEMO_MAX_BUFFER = 64 * 1024 * 1024;
const DST_META = resolve(PKG_ROOT, "src/cli-meta.json");
const DST_PROVENANCE = resolve(PKG_ROOT, "src/cli-meta.provenance.json");

const PIN = {
  repo: "jmchilton/planemo",
  branch: "workflow_work",
  sha: "a9b8b8bc7ab3b12035d53bdb5383fe450413d9f3",
  note: "Pre-merge of upstream PR galaxyproject/planemo#1636. Unpin once upstream merges + releases.",
};

const result = spawnSync(PLANEMO_BIN, ["cli_metadata"], {
  encoding: "utf8",
  maxBuffer: PLANEMO_MAX_BUFFER,
});

if (result.error) {
  process.stderr.write(
    `error: failed to invoke '${PLANEMO_BIN}': ${result.error.message}\n` +
      `Install the pinned planemo:\n` +
      `  uvx --from git+https://github.com/${PIN.repo}@${PIN.sha} planemo --version\n`,
  );
  process.exit(1);
}
if (result.status !== 0) {
  process.stderr.write(`${PLANEMO_BIN} exited ${result.status}\n${result.stderr}`);
  process.exit(result.status ?? 1);
}

let full;
try {
  full = JSON.parse(result.stdout);
} catch (err) {
  process.stderr.write(
    `error: failed to parse planemo stdout as JSON: ${err instanceof Error ? err.message : String(err)}\n`,
  );
  process.exit(1);
}

const minimal = {
  aliases: full.aliases ?? {},
  commands: (full.commands ?? []).map((c) => ({
    hidden: c.hidden ?? false,
    internal: c.internal ?? false,
    module: c.module ?? null,
    name: c.name,
  })),
  planemo_version: full.planemo_version ?? "unknown",
  program: full.program ?? "planemo",
  schema_version: full.schema_version ?? "unknown",
};

const provenance = {
  planemo_version: minimal.planemo_version,
  schema_version: minimal.schema_version,
  source: {
    branch: PIN.branch,
    note: PIN.note,
    repo: PIN.repo,
    sha: PIN.sha,
  },
};

writeFileSync(DST_META, JSON.stringify(minimal, null, 2) + "\n");
writeFileSync(DST_PROVENANCE, JSON.stringify(provenance, null, 2) + "\n");

console.log(`synced ${DST_META} (${minimal.commands.length} commands)`);
console.log(`synced ${DST_PROVENANCE}`);
console.log(`planemo_version=${minimal.planemo_version}`);
console.log(`Run 'pnpm sync' to regenerate the TS mirror.`);
