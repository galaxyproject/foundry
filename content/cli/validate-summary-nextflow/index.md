---
type: cli-tool
tool: validate-summary-nextflow
origin: npm
package: "@galaxy-foundry/summary-nextflow-schema"
invoke: validate-summary-nextflow
invoke_fallback: "npx --package @galaxy-foundry/summary-nextflow-schema validate-summary-nextflow"
availability_check: "validate-summary-nextflow --help"
docs_url: "https://github.com/jmchilton/foundry/blob/main/packages/summary-nextflow-schema/README.md"
tags:
  - cli-tool
  - cli/foundry
status: draft
created: 2026-05-10
revised: 2026-05-10
revision: 1
ai_generated: true
summary: "AJV-backed validator that schema-checks summary-nextflow.json before it leaves the summarize-nextflow skill."
---

# validate-summary-nextflow

Foundry-shipped CLI that validates `summary-nextflow.json` artifacts against the canonical schema. Bundled in the `@galaxy-foundry/summary-nextflow-schema` npm package.

## Install

`npx --package @galaxy-foundry/summary-nextflow-schema validate-summary-nextflow <summary.json>` is the no-install invocation. In workspace contexts the bin lives at `node_modules/.bin/validate-summary-nextflow`.
