// Regenerate the kind manifest — packages/note-schema/src/types/kinds.generated.json.
//
// Usage:
//   tsx scripts/generate-kind-manifest.ts [--check]
//
// --check: exit non-zero if the committed file is stale; do not write.
//
// The manifest is the machine-readable answer to "what note kinds does this Foundry define,
// and what metadata does each require". Its `fields` are derived from the zod shapes, so the
// file cannot drift from the schema — only from the schema's last regeneration, which is what
// --check catches in CI.
//
// It is committed rather than built on demand because its consumer is another repository: the
// foundry-pattern site renders both instances' manifests side by side as a kind catalog, and
// it must be able to read them from a checkout without installing either instance's toolchain.

import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import {
  buildKindManifest,
  loadLicensePolicy,
  loadReferenceContract,
  loadTagRegistry,
} from "@galaxy-foundry/note-schema";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TYPES_DIR = path.join(REPO_ROOT, "packages/note-schema/src/types");
const OUTPUT = path.join(TYPES_DIR, "kinds.generated.json");
const INSTANCE = "galaxy-workflow-foundry";

/** kind name -> kind.md body, read from the directories the barrel enumerates. */
function loadDocs(): Record<string, string> {
  const docs: Record<string, string> = {};
  for (const entry of readdirSync(TYPES_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    docs[entry.name] = readFileSync(path.join(TYPES_DIR, entry.name, "kind.md"), "utf8").trim();
  }
  return docs;
}

const manifest = buildKindManifest({
  instance: INSTANCE,
  docs: loadDocs(),
  tags: loadTagRegistry(path.join(REPO_ROOT, "meta_tags.yml")),
  contract: loadReferenceContract(path.join(REPO_ROOT, "reference_contract.yml")),
  licensePolicy: loadLicensePolicy(REPO_ROOT),
});

const rendered = `${JSON.stringify(manifest, null, 2)}\n`;

if (process.argv.includes("--check")) {
  let current = "";
  try {
    current = readFileSync(OUTPUT, "utf8");
  } catch {
    current = "";
  }
  if (current !== rendered) {
    console.error(
      `${path.relative(REPO_ROOT, OUTPUT)} is stale — run \`npm run kinds\` and commit the result.`,
    );
    process.exit(1);
  }
  console.log(`${path.relative(REPO_ROOT, OUTPUT)} is up to date (${manifest.kinds.length} kinds).`);
} else {
  writeFileSync(OUTPUT, rendered);
  console.log(`Wrote ${path.relative(REPO_ROOT, OUTPUT)} (${manifest.kinds.length} kinds).`);
}
