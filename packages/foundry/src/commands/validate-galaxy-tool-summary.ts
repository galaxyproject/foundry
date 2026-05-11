// The canonical schema's `$defs.ParsedTool` is a placeholder; before AJV
// compiles, replace it with `parsedToolSchema` from `@galaxy-tool-util/schema`
// so the parsed_tool subtree is validated against the upstream contract.

import { parsedToolSchema } from "@galaxy-tool-util/schema";
import { galaxyToolSummarySchema } from "../schemas/galaxy-tool-summary/galaxy-tool-summary.schema.generated.js";
import { createValidator } from "../lib/validator.js";
import { runJsonValidator } from "../lib/run-json-validator.js";

function buildSchema(): object {
  // Strip upstream `$schema` (2020-12) before inlining — embedding it under a
  // draft-07 root confuses AJV's draft inference. parsedToolSchema's keywords
  // are draft-07-compatible.
  const { $schema: _drop, ...parsedToolBody } = parsedToolSchema as unknown as Record<
    string,
    unknown
  >;
  const merged = JSON.parse(JSON.stringify(galaxyToolSummarySchema)) as {
    $defs: Record<string, unknown>;
  };
  merged.$defs.ParsedTool = parsedToolBody;
  return merged;
}

export const galaxyToolSummaryValidator = createValidator(buildSchema());

export function runValidateGalaxyToolSummary(path: string): never {
  runJsonValidator(path, galaxyToolSummaryValidator);
}
