---
name: nextflow-summary-to-galaxy-interface
description: "Map a Nextflow summary into a Galaxy workflow interface design brief."
---

# nextflow-summary-to-galaxy-interface

Follow the procedure below and use the artifact/reference sections as the runtime contract.

## When To Use

- Map a Nextflow summary into a Galaxy workflow interface design brief.

## Inputs

- Read artifact `summary-nextflow`. Schema: summary-nextflow. Produced by `summarize-nextflow`. Structured Nextflow pipeline summary emitted by summarize-nextflow; the source-of-truth JSON for interface choices.

## Outputs

- Write artifact `nextflow-galaxy-interface` as `nextflow-galaxy-interface.md`. Format: `markdown`. Reviewable Markdown brief: Galaxy workflow inputs, outputs, labels, collection shapes, checkpoint outputs, source provenance.

## Load Upfront

- `references/notes/nextflow-params-to-galaxy-inputs.md`: Research note copied verbatim into the bundle. Translate Nextflow launch params, materialized inputs, sample sheets, and control flags into gxformat2-compatible Galaxy workflow inputs.
- `references/notes/nextflow-path-glob-to-galaxy-datatype.md`: Research note copied verbatim into the bundle. Choose Galaxy datatype extensions and confidence notes for data inputs, collection elements, and exposed outputs.
- `references/notes/nextflow-to-galaxy-channel-shape-mapping.md`: Research note copied verbatim into the bundle. Choose Galaxy File/list/paired/list:paired/list:list interface shapes from Nextflow channel shapes.
- `references/schemas/summary-nextflow.schema.json`: Schema file copied verbatim into the bundle. Read source-level channel, parameter, process, and test-fixture evidence before choosing Galaxy workflow inputs and outputs.

## Load On Demand

- `references/notes/galaxy-sample-sheet-collections.md`: Research note copied verbatim into the bundle. Pick the right sample_sheet variant and translate nf-schema column metadata into Galaxy column_definitions when the source pipeline uses sample-sheet-shaped inputs. Use when: the Nextflow summary reports a samplesheetToList materialization, a parameter whose nf-schema entry sets schema: assets/schema_*.json, or a channel built from splitCsv(header: true) over a tabular params input.
- `references/notes/galaxy-workflow-testability-design.md`: Research note copied verbatim into the bundle. Choose stable workflow input/output labels and promoted checkpoint outputs that future tests can address. Use when: deciding labels, public outputs, checkpoint outputs, or fixture-compatible collection inputs.
- `references/notes/nextflow-to-galaxy-reference-data-mapping.md`: Research note copied verbatim into the bundle. Translate iGenomes-style and per-asset reference-data params into Galaxy inputs without inheriting nf-core's reference-resolution magic; v1 posture is explicit optional inputs with in-tool rebuild on absence. Use when: the source pipeline declares iGenomes-derived params (params.genome with getGenomeAttribute), per-asset reference path params (fasta, fasta_fai, dict, bwa_index, dbsnp, known_indels, intervals, pon), or any compute-if-missing index-building branch in the source.

## Validation

- None declared.

## Procedure

Read a Nextflow summary and emit a reviewable Markdown interface brief for a Galaxy workflow. Capture workflow inputs, workflow outputs, labels, Galaxy collection shapes, checkpoint outputs worth exposing for tests, source-summary provenance, confidence, and open questions.

The output is not a gxformat2 skeleton and not a workflow schema. It is a design handoff consumed by nextflow-summary-to-galaxy-data-flow, nextflow-summary-to-galaxy-template, and later test-plan work.

## Runtime Notes

- Do not read Foundry source files at runtime; use only files packaged in this skill bundle and user-supplied artifacts.
- Preserve declared artifact filenames unless the user or harness supplies explicit paths.
- Carry unresolved assumptions into the output artifact instead of silently inventing missing source evidence.
