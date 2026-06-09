---
type: cli-tool
tool: validate-summary-cwl
origin: npm
package: "@galaxy-foundry/summary-cwl-schema"
invoke: validate-summary-cwl
invoke_fallback: "npx --package @galaxy-foundry/summary-cwl-schema validate-summary-cwl"
availability_check: "validate-summary-cwl --help"
docs_url: "https://github.com/galaxyproject/foundry/blob/main/packages/summary-cwl-schema/README.md"
tags:
  - cli-tool
  - cli/foundry
status: draft
created: 2026-05-10
revised: 2026-05-10
revision: 1
ai_generated: true
summary: "AJV-backed validator that schema-checks summary-cwl.json before it leaves the summarize-cwl skill."
---

# validate-summary-cwl

Foundry-shipped CLI that validates `summary-cwl.json` artifacts against the canonical schema. Bundled in the `@galaxy-foundry/summary-cwl-schema` npm package.

## Install

`npx --package @galaxy-foundry/summary-cwl-schema validate-summary-cwl <summary.json>` is the no-install invocation. In environments where the package is already a workspace dependency, the bin lives at `node_modules/.bin/validate-summary-cwl`.
