// `--schema-sha256` for every single-schema `foundry validate-*` subcommand. A cast bundle pins
// the hash of the schema it copied; a validator carrying a different one exits 4 unvalidated.

import { createHash } from "node:crypto";
import process from "node:process";
import type { Command } from "commander";
import { SCHEMA_PIN_DESCRIPTION, SCHEMA_PIN_FLAGS } from "../meta/schema-pin.js";
import { FOUNDRY_VERSION } from "../meta/version.generated.js";

export const SCHEMA_SKEW_EXIT = 4;

/** sha256 of the bytes cast writes for a package-export schema: `JSON.stringify(x, null, 2) + "\n"`. */
export function schemaSha256(schema: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(schema, null, 2) + "\n")
    .digest("hex");
}

/** Add `--schema-sha256` to `command`, whose artifact argument must be declared optional. */
export function attachSchemaPin(command: Command, schemaName: string, schema: unknown): Command {
  return command.option(SCHEMA_PIN_FLAGS, SCHEMA_PIN_DESCRIPTION).hook("preAction", (cmd) => {
    const expected = cmd.opts().schemaSha256 as string | undefined;
    const hasArtifact = cmd.args.length > 0;
    if (expected === undefined) {
      if (!hasArtifact) {
        process.stderr.write(
          `error: missing required argument '${cmd.registeredArguments[0]?.name()}'\n`,
        );
        process.exit(1);
      }
      return;
    }
    const actual = schemaSha256(schema);
    if (actual !== expected.toLowerCase()) {
      process.stderr.write(
        `schema skew: @galaxy-foundry/gxwf-foundry ${FOUNDRY_VERSION} validates ${schemaName} against sha256 ${actual}, but the caller pinned ${expected}. Nothing was validated; this is a validator/bundle version mismatch, not an artifact defect. Install the gxwf-foundry release the skill bundle was cast against, or recast the bundle.\n`,
      );
      process.exit(SCHEMA_SKEW_EXIT);
    }
    if (!hasArtifact) {
      process.stdout.write(`${schemaName}: schema matches ${actual}\n`);
      process.exit(0);
    }
  });
}
