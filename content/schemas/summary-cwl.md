---
type: schema
name: summary-cwl
title: CWL workflow summary
package: "@galaxy-foundry/summary-cwl-schema"
package_export: "summaryCwlSchema"
validator_bin: validate-summary-cwl
upstream: "https://github.com/jmchilton/foundry/blob/main/packages/summary-cwl-schema/src/summary-cwl.schema.json"
license: MIT
tags:
  - schema
  - source/cwl
status: draft
created: 2026-05-10
revised: 2026-05-10
revision: 1
ai_generated: true
related_notes:
  - "[[summarize-cwl]]"
  - "[[component-cwl-workflow-anatomy]]"
  - "[[cwl-summary-to-galaxy-interface]]"
  - "[[cwl-summary-to-galaxy-data-flow]]"
  - "[[cwl-summary-to-galaxy-template]]"
  - "[[author-galaxy-tool-wrapper]]"
  - "[[cwl-test-to-galaxy-test-plan]]"
summary: "JSON Schema for the structured summary emitted by the summarize-cwl Mold."
---

This page points to the JSON Schema authored in this repo and shipped as `@galaxy-foundry/summary-cwl-schema`. The schema is intentionally smaller than [[summary-nextflow]] because CWL already carries typed workflow and tool structure.

**Source-of-truth chain:**

1. `packages/summary-cwl-schema/src/summary-cwl.schema.json` — canonical JSON, hand-edited as part of the Mold/cast loop.
2. `packages/summary-cwl-schema/scripts/sync-schema.mjs` regenerates the typed `summary-cwl.schema.generated.ts` const wrapper.
3. Published as `@galaxy-foundry/summary-cwl-schema`, exporting `summaryCwlSchema`, `validateSummary()`, and the `validate-summary-cwl` CLI.

Generated skills should validate emitted summaries with:

```sh
validate-summary-cwl summary-cwl.json
```

## Why This Is Lighter Than Nextflow

Nextflow summarization has to infer process graphs, channel shapes, sample-sheet semantics, containers, and tests from DSL2 plus ecosystem conventions. CWL has first-class workflow inputs, workflow outputs, `WorkflowStep.run`, `CommandLineTool` inputs/outputs, `scatter`, `when`, and requirement blocks. The summary therefore records validated CWL structure and adds only the annotations downstream Galaxy molds need.

## Top-Level Shape

The v1 summary contains:

- `source` — `ecosystem: cwl`, workflow name, entrypoint, declared `cwlVersion`, URL/path, optional pin/license.
- `documents` — entrypoint, optional `cwltool --pack` output path, and validation diagnostics.
- `workflow_inputs` / `workflow_outputs` — CWL ids, compact type strings, formats, secondary files, defaults, labels, and docs.
- `steps` — `run`, run class, input sources, outputs, scatter/scatterMethod, `when`, requirements, and hints.
- `tools` — `CommandLineTool` command surface: base command, arguments, tool inputs/outputs, bindings, Docker/Software requirements, and hints.
- `graph` — simple source-to-sink edges with `via` markers for shape-affecting features such as scatter, `linkMerge`, `pickValue`, and `valueFrom`.
- `tests` — job files and expected outputs only when supplied or discoverable by convention.
- `warnings` — unsupported extensions, expression-heavy edges, missing referenced files, and remote resolution failures.

## Intentional Non-Goals

- No target translation. Galaxy collection choice, datatype choice, Tool Shed discovery, and gxformat2 authoring belong to downstream molds.
- No full JavaScript evaluation. `valueFrom`, `when`, and expression-derived globbing are preserved verbatim and flagged when they affect shape.
- No deep package solving. `DockerRequirement` and `SoftwareRequirement` are recorded; dependency resolution into concrete Galaxy wrappers is downstream work.
- No recursive data download by default. URL resolution is for CWL documents and directly referenced tool/workflow files, not arbitrary input data crawling.
