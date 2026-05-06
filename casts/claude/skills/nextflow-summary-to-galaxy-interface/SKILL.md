---
name: nextflow-summary-to-galaxy-interface
description: "Map a Nextflow summary into a Galaxy workflow interface design brief."
---

# nextflow-summary-to-galaxy-interface

This skill was deterministically cast from its Mold. Treat the Mold body below as the procedure and the artifact/reference sections as the runtime contract.

## When To Use

- Map a Nextflow summary into a Galaxy workflow interface design brief.

## Inputs

- `summary-nextflow`; schema: summary-nextflow; producer(s): `summarize-nextflow`; Structured Nextflow pipeline summary emitted by summarize-nextflow; the source-of-truth JSON for interface choices..

## Outputs

- `nextflow-galaxy-interface`; kind: `markdown`; default filename: `nextflow-galaxy-interface.md`; Reviewable Markdown brief: Galaxy workflow inputs, outputs, labels, collection shapes, checkpoint outputs, source provenance..

## Load Upfront

- `references/notes/nextflow-params-to-galaxy-inputs.md`; kind: `research`; mode: `verbatim`; Translate Nextflow launch params, materialized inputs, sample sheets, and control flags into gxformat2-compatible Galaxy workflow inputs..
- `references/notes/nextflow-path-glob-to-galaxy-datatype.md`; kind: `research`; mode: `verbatim`; Choose Galaxy datatype extensions and confidence notes for data inputs, collection elements, and exposed outputs..
- `references/notes/nextflow-to-galaxy-channel-shape-mapping.md`; kind: `research`; mode: `verbatim`; Choose Galaxy File/list/paired/list:paired/list:list interface shapes from Nextflow channel shapes..
- `references/schemas/summary-nextflow.schema.json`; kind: `schema`; mode: `verbatim`; Read source-level channel, parameter, process, and test-fixture evidence before choosing Galaxy workflow inputs and outputs..

## Load On Demand

- `references/notes/galaxy-sample-sheet-collections.md`; kind: `research`; mode: `verbatim`; Pick the right sample_sheet variant and translate nf-schema column metadata into Galaxy column_definitions when the source pipeline uses sample-sheet-shaped inputs.; Trigger: When the Nextflow summary reports a samplesheetToList materialization, a parameter whose nf-schema entry sets schema: assets/schema_*.json, or a channel built from splitCsv(header: true) over a tabular params input..
- `references/notes/galaxy-workflow-testability-design.md`; kind: `research`; mode: `verbatim`; Choose stable workflow input/output labels and promoted checkpoint outputs that future tests can address.; Trigger: When deciding labels, public outputs, checkpoint outputs, or fixture-compatible collection inputs..

## Validation

- None declared.

## Procedure

# nextflow-summary-to-galaxy-interface

Read a Nextflow summary and emit a reviewable Markdown interface brief for a Galaxy workflow. Capture workflow inputs, workflow outputs, labels, Galaxy collection shapes, checkpoint outputs worth exposing for tests, source-summary provenance, confidence, and open questions.

The output is not a gxformat2 skeleton and not a workflow schema. It is a design handoff consumed by nextflow-summary-to-galaxy-data-flow, nextflow-summary-to-galaxy-template, and later test-plan work.

## Runtime Notes

- Do not read Foundry source files at runtime; use only files packaged in this skill bundle and user-supplied artifacts.
- Preserve declared artifact filenames unless the user or harness supplies explicit paths.
- Carry unresolved assumptions into the output artifact instead of silently inventing missing source evidence.
