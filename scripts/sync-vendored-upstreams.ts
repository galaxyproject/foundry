import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  findVendoredDrift,
  loadVendoredUpstreams,
  partitionCheckable,
  syncVendoredUpstreams,
  updateVendoredManifestRefs,
} from "./lib/vendored-upstreams";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = path.join(repoRoot, "vendored_upstreams.yml");
const args = new Set(process.argv.slice(2));

function usage(): never {
  console.error("Usage: pnpm sync:vendored [--check [--strict]|--update]");
  process.exit(2);
}

const strict = args.delete("--strict");
if (args.size !== 1 || (!args.has("--check") && !args.has("--update"))) usage();
if (strict && !args.has("--check")) usage();

const entries = loadVendoredUpstreams(repoRoot);

if (args.has("--check")) {
  // Skips are reported, never silent: a check that quietly shrinks its own scope
  // reads as coverage it does not have. `--strict` turns them into a failure for
  // the machine that does have every upstream checked out.
  const { checkable, skipped } = partitionCheckable(repoRoot, entries);
  for (const item of skipped) {
    console.warn(`SKIP ${item.entry.local}: ${item.reason}`);
  }
  const drift = findVendoredDrift(repoRoot, checkable);
  for (const item of drift) {
    console.warn(
      `${item.entry.local} differs from ${item.entry.source} at ${item.currentRef.slice(0, 12)}`,
    );
  }
  if (drift.length) process.exit(1);
  console.log(
    `Checked ${checkable.length} of ${entries.length} vendored upstream files; no drift.` +
      (skipped.length ? ` ${skipped.length} skipped (no local upstream).` : ""),
  );
  if (skipped.length && strict) {
    console.error(`--strict: ${skipped.length} entr(ies) could not be checked.`);
    process.exit(1);
  }
} else {
  const updated = syncVendoredUpstreams(repoRoot, entries);
  updateVendoredManifestRefs(
    manifestPath,
    new Map(updated.map((item) => [item.entry.local, item.currentRef])),
  );
  for (const item of updated) {
    console.log(
      `Synced ${item.entry.local} from ${item.entry.source} at ${item.currentRef.slice(0, 12)}`,
    );
  }
}
