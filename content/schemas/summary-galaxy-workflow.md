---
type: schema
name: summary-galaxy-workflow
title: Galaxy workflow summary
package: "@galaxy-foundry/foundry"
package_export: "summaryGalaxyWorkflowSchema"
validator_bin: foundry
validator_subcommand: validate-summary-galaxy-workflow
upstream: "https://github.com/galaxyproject/foundry/blob/main/packages/foundry/src/schemas/summary-galaxy-workflow/summary-galaxy-workflow.schema.json"
license: MIT
tags:
  - schema
  - source/galaxy
status: draft
created: 2026-07-01
revised: 2026-07-01
revision: 1
ai_generated: true
related_notes:
  - "[[summarize-galaxy-workflow]]"
  - "[[interview-to-galaxy-workflow-changeset]]"
summary: "JSON Schema for the structured summary emitted by the summarize-galaxy-workflow Mold."
---

This page points to the JSON Schema authored in this repo and shipped as part of `@galaxy-foundry/foundry` (orphan schema — no TypeScript producer Mold owns it; the producer is the LLM-run [[summarize-galaxy-workflow]] Mold). The schema is intentionally lighter than [[summary-nextflow]] because gxformat2 already carries typed workflow structure, mirroring [[summary-cwl]] on the Galaxy-as-source side.

**Source-of-truth chain:**

1. `packages/foundry/src/schemas/summary-galaxy-workflow/summary-galaxy-workflow.schema.json` — canonical JSON, hand-edited as part of the Mold/cast loop.
2. `packages/foundry/scripts/sync-schema.mjs` regenerates the typed `summary-galaxy-workflow.schema.generated.ts` const wrapper at `prebuild`.
3. Published as part of `@galaxy-foundry/foundry`, exporting `summaryGalaxyWorkflowSchema` and the `foundry validate-summary-galaxy-workflow` subcommand.

Generated skills should validate emitted summaries with:

```sh
foundry validate-summary-galaxy-workflow summary-galaxy-workflow.json
```

## Why This Is Lighter Than Nextflow

Nextflow summarization infers process graphs, channel shapes, sample-sheet semantics, and containers from DSL2 plus ecosystem conventions. A Galaxy workflow is already an explicit graph: workflow inputs, workflow outputs, per-step `tool_id` / `tool_version` / `tool_state`, and named input connections are all first-class in gxformat2. The summary therefore records validated, normalized structure and adds only the annotations the update pipeline's interview and change-set steps need.

## Top-Level Shape

The v1 summary contains:

- `source` — `ecosystem: galaxy`, workflow name, slug, `format` (always `gxformat2`), `original_format` (`gxformat2` or `ga`), release, license, annotation, URL/pin.
- `documents` — entrypoint, optional `converted_path` (populated when a legacy `.ga` was converted via `gxwf convert`), and validation diagnostics.
- `workflow_inputs` / `workflow_outputs` — ids/labels, input class (`data` / `collection` / `parameter`), collection type, optionality, defaults, formats; outputs record the promoted `step/output` source.
- `steps` — step class, `tool_id`, `tool_version`, pinned `tool_shed_repository`, verbatim `tool_state`, named input connections with their sources, declared outputs, and `when` guards.
- `graph` — source-to-sink edges with `via` markers for shape-affecting Galaxy features (map-over, batch, collection reduction).
- `tests` — existing workflow tests (sibling `*-tests.yml`) recorded as the regression baseline, only when discoverable.
- `warnings` — unsupported extensions, lossy conversions, unresolved references.

## Intentional Non-Goals

- No target translation or editing. The change-set (interview-driven) and its application to the workflow belong to [[interview-to-galaxy-workflow-changeset]] and [[apply-galaxy-workflow-changeset]].
- No tool discovery or wrapper authoring. `tool_id` / `tool_shed_repository` are recorded as-found; resolution of newly introduced tools is the per-step Galaxy loop's job.
- No runtime execution. This Mold summarizes and validates structure; [[run-workflow-test]] owns execution.
