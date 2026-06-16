/**
 * @module @galaxy-foundry/foundry/meta
 *
 * Browser-safe CLI metadata for the `foundry` program. The Foundry
 * site's `cli-registry` imports this subpath to render per-subcommand
 * pages without shelling out to `foundry --help` or pulling commander
 * into a browser bundle.
 *
 * Source of truth is the commander program in `bin/foundry.ts`; this
 * module mirrors that program as static data. Parity is verified by
 * `test/meta-parity.test.ts`.
 */

import type { CliProgramSpec } from "./types.js";
import { FOUNDRY_VERSION } from "./version.generated.js";

export type {
  CliProgramSpec,
  CliCommandSpec,
  CliOptionSpec,
  CliPositionalArgSpec,
} from "./types.js";

export const foundryCliMeta: CliProgramSpec = {
  name: "foundry",
  description:
    "Galaxy Workflow Foundry CLI — produce and validate Mold IO artifacts (summaries, recommendations, test files).",
  version: FOUNDRY_VERSION,
  commands: [
    {
      name: "summarize-nextflow",
      fullName: "foundry summarize-nextflow",
      description: "Statically introspect a Nextflow / nf-core pipeline and emit a JSON summary.",
      synopsis: "foundry summarize-nextflow [options] <path-or-url>",
      args: [
        {
          raw: "path-or-url",
          name: "path-or-url",
          required: true,
          variadic: false,
          description: "Path to a local pipeline clone, or a git URL",
        },
      ],
      options: [
        {
          flags: "--profile <name>",
          name: "profile",
          description: "Profile to resolve config under",
          takesArgument: true,
          argumentPlaceholder: "<name>",
          optionalArgument: false,
          negatable: false,
          defaultValue: "test",
        },
        {
          flags: "--pin <ref>",
          name: "pin",
          description: "Tag, branch, or commit SHA",
          takesArgument: true,
          argumentPlaceholder: "<ref>",
          optionalArgument: false,
          negatable: false,
        },
        {
          flags: "--out <path>",
          name: "out",
          description: "Write JSON to this path instead of stdout",
          takesArgument: true,
          argumentPlaceholder: "<path>",
          optionalArgument: false,
          negatable: false,
        },
        {
          flags: "--no-with-nextflow",
          name: "withNextflow",
          description: "Disable Nextflow shell-out; static parse only (default: enabled)",
          takesArgument: false,
          optionalArgument: false,
          negatable: true,
        },
        {
          flags: "--fetch-test-data",
          name: "fetchTestData",
          description: "Resolve and hash referenced test data",
          takesArgument: false,
          optionalArgument: false,
          negatable: false,
          defaultValue: false,
        },
        {
          flags: "--test-data-dir <path>",
          name: "testDataDir",
          description: "Write fetched test data under this directory",
          takesArgument: true,
          argumentPlaceholder: "<path>",
          optionalArgument: false,
          negatable: false,
        },
        {
          flags: "--mulled-index-path <path>",
          name: "mulledIndexPath",
          description: "Cached BioContainers multi-package-containers TSV",
          takesArgument: true,
          argumentPlaceholder: "<path>",
          optionalArgument: false,
          negatable: false,
        },
        {
          flags: "--no-validate",
          name: "validate",
          description: "Skip schema validation of the emitted summary (default: enabled)",
          takesArgument: false,
          optionalArgument: false,
          negatable: true,
        },
      ],
      commands: [],
    },
    {
      name: "validate-summary-nextflow",
      fullName: "foundry validate-summary-nextflow",
      description: "Validate a summarize-nextflow JSON document.",
      synopsis: "foundry validate-summary-nextflow <summary.json>",
      args: [
        {
          raw: "summary.json",
          name: "summary.json",
          required: true,
          variadic: false,
        },
      ],
      options: [],
      commands: [],
    },
    {
      name: "validate-summary-cwl",
      fullName: "foundry validate-summary-cwl",
      description: "Validate a summarize-cwl JSON document.",
      synopsis: "foundry validate-summary-cwl <summary.json>",
      args: [
        {
          raw: "summary.json",
          name: "summary.json",
          required: true,
          variadic: false,
        },
      ],
      options: [],
      commands: [],
    },
    {
      name: "validate-galaxy-tool-discovery",
      fullName: "foundry validate-galaxy-tool-discovery",
      description: "Validate a discover-shed-tool recommendation document.",
      synopsis: "foundry validate-galaxy-tool-discovery <recommendation.json>",
      args: [
        {
          raw: "recommendation.json",
          name: "recommendation.json",
          required: true,
          variadic: false,
        },
      ],
      options: [],
      commands: [],
    },
    {
      name: "validate-galaxy-tool-summary",
      fullName: "foundry validate-galaxy-tool-summary",
      description: "Validate a galaxy-tool-cache summarize manifest.",
      synopsis: "foundry validate-galaxy-tool-summary <manifest.json>",
      args: [
        {
          raw: "manifest.json",
          name: "manifest.json",
          required: true,
          variadic: false,
        },
      ],
      options: [],
      commands: [],
    },
    {
      name: "validate-galaxy-workflow-test-plan",
      fullName: "foundry validate-galaxy-workflow-test-plan",
      description: "Validate a Galaxy workflow test-plan YAML document.",
      synopsis: "foundry validate-galaxy-workflow-test-plan <test-plan.yml>",
      args: [
        {
          raw: "test-plan.yml",
          name: "test-plan.yml",
          required: true,
          variadic: false,
        },
      ],
      options: [],
      commands: [],
    },
    {
      name: "validate-tests-format",
      fullName: "foundry validate-tests-format",
      description:
        "Validate a Galaxy workflow tests YAML file; optionally cross-check against a workflow.",
      synopsis: "foundry validate-tests-format [options] <tests.yml>",
      args: [
        {
          raw: "tests.yml",
          name: "tests.yml",
          required: true,
          variadic: false,
        },
      ],
      options: [
        {
          flags: "--workflow <path>",
          name: "workflow",
          description: "Workflow file to cross-check inputs/outputs against",
          takesArgument: true,
          argumentPlaceholder: "<path>",
          optionalArgument: false,
          negatable: false,
        },
        {
          flags: "--json",
          name: "json",
          description: "Emit machine-readable JSON report",
          takesArgument: false,
          optionalArgument: false,
          negatable: false,
          defaultValue: false,
        },
      ],
      commands: [],
    },
  ],
};
