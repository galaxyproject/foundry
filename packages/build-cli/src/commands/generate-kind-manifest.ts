#!/usr/bin/env tsx

// Generate packages/note-schema/src/types/kinds.generated.json — the machine-readable answer
// to "what note kinds does this Foundry define, and what metadata does each require".
//
// `fields` are derived from the zod shapes, so the file cannot drift from the schema — only
// from the schema's last regeneration, which is what --check catches in CI.
//
// It is committed rather than built on demand because its consumer is another repository: the
// foundry-pattern site renders both instances' manifests side by side as a kind catalog, and
// it must be able to read them from a checkout without installing either instance's toolchain.

import path from "node:path";
import process from "node:process";

import { loadKindDocs } from "@galaxy-foundry/kind-schema/docs";
import { bundledPolicy } from "@galaxy-foundry/license-policy";
import { KINDS, buildKindManifest, loadReferenceContract } from "@galaxy-foundry/note-schema";
import { loadTagRegistry } from "@galaxy-foundry/tag-registry";

import { writeOrCheck } from "../lib/content-notes.js";

const TYPES_DIR = "packages/note-schema/src/types";
const OUTPUT = `${TYPES_DIR}/kinds.generated.json`;
const INSTANCE = "galaxy-workflow-foundry";

/**
 * Read each kind's `kind.md`, or say which one is missing and stop.
 *
 * The READING is not ours — it ships in @galaxy-foundry/kind-schema, because the other instance
 * wrote the same loader beside the same manifest call. What stays here is the decision to exit:
 * the package throws, deliberately, so a library never takes a command's exit for it. Reported
 * as one line rather than rethrown, because the bin's catch-all prints a stack.
 */
function loadDocs(typesDir: string): Record<string, string> {
  try {
    return loadKindDocs(KINDS, typesDir);
  } catch (e) {
    process.stderr.write(`${(e as Error).message}\n`);
    process.exit(1);
  }
}

export function runGenerateKindManifestCommand(argv = process.argv.slice(2)): void {
  const opts = parseGenerateKindManifestArgs(argv);

  const manifest = buildKindManifest({
    instance: INSTANCE,
    docs: loadDocs(path.join(opts.root, TYPES_DIR)),
    tags: loadTagRegistry(path.join(opts.root, "meta_tags.yml")),
    contract: loadReferenceContract(path.join(opts.root, "reference_contract.yml")),
    licensePolicy: bundledPolicy(),
  });

  const output = path.join(opts.root, OUTPUT);
  writeOrCheck(output, `${JSON.stringify(manifest, null, 2)}\n`, opts.check);
  process.stdout.write(
    `${opts.check ? "Checked" : "Wrote"} ${OUTPUT} (${manifest.kinds.length} kinds).\n`,
  );
}

interface GenerateKindManifestArgs {
  check: boolean;
  root: string;
}

function usage(): never {
  process.stderr.write("Usage: foundry-build generate-kinds [--check] [--root <dir>]\n");
  process.exit(2);
}

function parseGenerateKindManifestArgs(argv: string[]): GenerateKindManifestArgs {
  const args: GenerateKindManifestArgs = { check: false, root: "." };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--check") args.check = true;
    else if (a === "--root") args.root = argv[++i] ?? usage();
    else if (a?.startsWith("--root=")) args.root = a.slice("--root=".length) || usage();
    // An unrecognized flag is an error, not a no-op: `--chekc` must not silently fall through
    // to the write branch and overwrite the file the caller asked us to check.
    else usage();
  }
  return args;
}

const isDirectInvocation = import.meta.url === `file://${process.argv[1]}`;
if (isDirectInvocation) runGenerateKindManifestCommand();
