---
name: implement-galaxy-tool-step
description: "Convert an abstract step into a concrete gxformat2 step using a tool summary."
---

# implement-galaxy-tool-step

Follow the procedure below and use the artifact/reference sections as the runtime contract.

## When To Use

- Convert an abstract step into a concrete gxformat2 step using a tool summary.

## Inputs

- Read artifact `galaxy-tool-summary`. Schema: galaxy-tool-summary. Produced by `summarize-galaxy-tool`. Galaxy tool summary manifest from summarize-galaxy-tool conforming to galaxy-tool-summary; binds the abstract step to a concrete tool's ports via the embedded `parsed_tool` and generated `input_schemas`.
- Read artifact `galaxy-workflow-draft`. Schema: galaxy-workflow-draft. Produced by `advance-galaxy-draft-step`, `cwl-summary-to-galaxy-template`, `freeform-summary-to-galaxy-template`, `implement-galaxy-tool-step`, `nextflow-summary-to-galaxy-template`. gxformat2 skeleton being filled in step by step; the step replaces a placeholder in this draft.

## Outputs

- Write artifact `galaxy-workflow-draft` as `galaxy-workflow-draft.gxwf.yml`. Format: `yaml`. Schema: galaxy-workflow-draft. gxformat2 skeleton with one more abstract step replaced by a concrete tool step (loop iteration output).

## Required Tools

- **`gxwf`** (gxwf). `npm install -g @galaxy-tool-util/cli`.
  Ephemeral run: `npx --package @galaxy-tool-util/cli gxwf`.
  Check: `gxwf --version`.
  Docs: https://github.com/jmchilton/galaxy-tool-util-ts/tree/main/packages/cli

## Load Upfront

- `references/schemas/galaxy-tool-summary.schema.json`: Schema file copied verbatim into the bundle. Bind the abstract step against the deterministic tool summary manifest emitted upstream — read `parsed_tool` for ports/datatypes and `input_schemas.workflow_step_linked` for valid step `tool_state` shape.
- `references/schemas/galaxy-workflow-draft.schema.json`: Schema file copied verbatim into the bundle. In/out contract: the draft this Mold reads and mutates in place conforms to galaxy-workflow-draft. Cast bundles the JSON Schema alongside the draft-validate CLI checks.

## Load On Demand

- `references/cli/draft-validate.json`: CLI command reference packaged as a sidecar. Validate the mutated draft against draft-contract rules; with --concrete, also gate the extracted concrete subset (including the step just implemented) against full gxformat2. Use when: after implementing or modifying a concrete tool step in the draft.
- `references/patterns/galaxy-collection-patterns.md`: Pattern note copied verbatim into the bundle. Choose corpus-attested collection recipes when implementing concrete Galaxy steps. Use when: implementation needs cleanup-after-fanout, sync-by-identifier, singleton unboxing, relabeling, collection reshaping, or collection-tabular bridges.
- `references/patterns/galaxy-tabular-patterns.md`: Pattern note copied verbatim into the bundle. Choose corpus-attested tabular recipes when implementing concrete Galaxy steps. Use when: implementation needs row filtering, column projection, computed columns, joins, grouping, SQL, awk, text-processing wrappers, or tabular-collection bridges.
- `references/notes/galaxy-apply-rules-dsl.md`: Research note copied verbatim into the bundle. Implement identifier-derived collection reshaping via Apply Rules. Use when: collection element identifiers need regex parsing, nesting-level swaps, regrouping, or paired identifier assignment.
- `references/notes/galaxy-collection-semantics.md`: Research note copied verbatim into the bundle. Connect concrete Galaxy tool inputs/outputs while preserving collection mapping and reduction semantics. Use when: implementing a step with data_collection inputs, mapped outputs, reductions, or nested collection wiring.
- `references/notes/galaxy-collection-semantics.upstream.myst`: Companion file copied verbatim into the bundle. Sibling of `references/notes/galaxy-collection-semantics.md`; read it where that note directs.
- `references/notes/galaxy-collection-semantics.yml`: Companion file copied verbatim into the bundle. Sibling of `references/notes/galaxy-collection-semantics.md`; read it where that note directs.
- `references/notes/galaxy-collection-tools.md`: Research note copied verbatim into the bundle. Insert built-in Galaxy collection-operation steps when a direct tool connection cannot express the needed shape. Use when: a step needs collection construction, filtering, extraction, zipping, unzipping, flattening, merging, or relabeling.
- `references/notes/galaxy-tool-job-failure-reference.md`: Research note copied verbatim into the bundle. Preserve concrete tool/job failure evidence while implementing step labels, tool ids, output labels, and collection wiring. Use when: a selected wrapper has explicit failure semantics, dynamic outputs, non-default stdio rules, strict-shell behavior, or runtime-only failure risk.
- `references/notes/galaxy-workflow-testability-design.md`: Research note copied verbatim into the bundle. Preserve testable output labels and collection element identifiers while replacing abstract steps with concrete gxformat2 steps. Use when: a concrete step changes output labels, emits collection outputs, creates a diagnostic checkpoint, or makes a final output too weakly assertable.
- `references/notes/nextflow-operators-to-galaxy-collection-recipes.md`: Research note copied verbatim into the bundle. Turn operator-derived abstract transforms into concrete Galaxy wiring, collection operations, or review requests. Use when: a concrete step implements behavior traced to map, join, groupTuple, branch, mix, combine, or multiMap.
- `references/notes/nextflow-to-galaxy-channel-shape-mapping.md`: Research note copied verbatim into the bundle. Check whether a concrete tool input/output can preserve the intended source-derived Galaxy collection shape. Use when: implementing concrete steps for source-derived File/list/paired/list:paired/list:list inputs or outputs.

## Validation

- Validate `galaxy-workflow-draft.gxwf.yml` for artifact `galaxy-workflow-draft` against the galaxy-workflow-draft schema when a validator is available.

## Procedure

Stub. Replace with real skill content per MOLD_SPEC once first walks are done.

## Runtime Notes

- Do not read Foundry source files at runtime; use only files packaged in this skill bundle and user-supplied artifacts.
- Preserve declared artifact filenames unless the user or harness supplies explicit paths.
- Carry unresolved assumptions into the output artifact instead of silently inventing missing source evidence.
