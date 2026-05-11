---
type: cli-tool
tool: foundry
origin: npm
package: "@galaxy-foundry/foundry"
invoke: foundry
invoke_fallback: "npx --package @galaxy-foundry/foundry foundry"
availability_check: "foundry --help"
docs_url: "https://github.com/jmchilton/foundry/blob/main/packages/foundry/README.md"
tags:
  - cli-tool
  - cli/foundry
status: draft
created: 2026-05-11
revised: 2026-05-11
revision: 1
ai_generated: true
summary: "Foundry CLI: bundles all Mold IO validators and a summarize-nextflow subcommand."
---

# foundry

Unified Foundry CLI. Subcommands cover every Mold IO validator plus a `summarize-nextflow` wrapper around the standalone `@galaxy-foundry/summarize-nextflow` package.

## Subcommands

- `foundry validate-summary-nextflow <file>` — AJV gate for [[summary-nextflow]] artifacts.
- `foundry validate-summary-cwl <file>` — AJV gate for [[summary-cwl]] artifacts.
- `foundry validate-galaxy-tool-discovery <file>` — AJV gate for [[galaxy-tool-discovery]] recommendations.
- `foundry validate-galaxy-tool-summary <file>` — AJV gate for [[galaxy-tool-summary]] manifests, including the nested `parsed_tool` subtree against [[parsed-tool]].
- `foundry validate-tests-format <file>` — AJV gate for planemo-format workflow tests against [[tests-format]].
- `foundry summarize-nextflow <pipeline>` — wraps `@galaxy-foundry/summarize-nextflow`'s `buildSummary` + `validateSummary` via library import.

## Install

`npx --package @galaxy-foundry/foundry foundry <subcommand>` runs without a global install. For repeat use, `npm install -g @galaxy-foundry/foundry`.
