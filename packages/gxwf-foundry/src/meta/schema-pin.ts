// Browser-safe `--schema-sha256` option spec, shared by the commander wiring and `foundryCliMeta`.

import type { CliOptionSpec } from "./types.js";

export const SCHEMA_PIN_FLAGS = "--schema-sha256 <hex>";
export const SCHEMA_PIN_DESCRIPTION =
  "Exit 4 unless this validator's schema has this sha256 (a cast bundle's _verify.json pin); with no artifact, check only the pin";

export const SCHEMA_PIN_OPTION: CliOptionSpec = {
  flags: SCHEMA_PIN_FLAGS,
  name: "schemaSha256",
  description: SCHEMA_PIN_DESCRIPTION,
  takesArgument: true,
  argumentPlaceholder: "<hex>",
  optionalArgument: false,
  negatable: false,
};
