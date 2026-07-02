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
- Read artifact `nextflow-galaxy-reference-data`. Produced by `nextflow-summary-to-galaxy-reference-data`. Reference-data shape brief from nextflow-summary-to-galaxy-reference-data that pins per-asset reference inputs and rebuild-on-absence behavior.
- Read artifact `open-requirements-ledger`. Produced by `advance-galaxy-draft-step`, `apply-galaxy-workflow-changeset`, `compare-against-iwc-exemplar`, `cwl-summary-to-galaxy-data-flow`, `cwl-summary-to-galaxy-interface`, `cwl-summary-to-galaxy-template`, `freeform-summary-to-galaxy-data-flow`, `freeform-summary-to-galaxy-interface`, `freeform-summary-to-galaxy-template`, `implement-galaxy-tool-step`, `interview-to-galaxy-workflow-changeset`, `nextflow-summary-to-galaxy-data-flow`, `nextflow-summary-to-galaxy-interface`, `nextflow-summary-to-galaxy-reference-data`, `nextflow-summary-to-galaxy-template`, `repair-galaxy-draft-topology`. Carried obligations ledger open-requirements-ledger: read prior open entries; this design step appends new unmet needs and marks ones its decisions resolve.

## Outputs

- Write artifact `nextflow-galaxy-interface` as `nextflow-galaxy-interface.md`. Format: `markdown`. Reviewable Markdown brief: Galaxy workflow inputs, outputs, labels, collection shapes, checkpoint outputs, source provenance.
- Write artifact `open-requirements-ledger` as `open-requirements.ledger.yml`. Format: `yaml`. Updated obligations ledger: new unmet needs this step surfaces appended; prior entries its decisions close marked resolved.

## Required Tools

- None declared. Procedure should not assume external CLIs are present.

## Load Upfront

- `references/notes/nextflow-params-to-galaxy-inputs.md`: Research note copied verbatim into the bundle. Translate Nextflow launch params, materialized inputs, sample sheets, and control flags into gxformat2-compatible Galaxy workflow inputs.
- `references/notes/nextflow-path-glob-to-galaxy-datatype.md`: Research note copied verbatim into the bundle. Choose Galaxy datatype extensions and confidence notes for data inputs, collection elements, and exposed outputs.
- `references/notes/nextflow-to-galaxy-channel-shape-mapping.md`: Research note copied verbatim into the bundle. Choose Galaxy File/list/paired/list:paired/list:list interface shapes from Nextflow channel shapes.
- `references/notes/open-requirements-ledger.md`: Research note copied verbatim into the bundle. Carry the open-requirements ledger: read open entries bearing on this step's decisions, mark resolved the ones it closes, and append any new unmet need it surfaces.
- `references/schemas/summary-nextflow.schema.json`: Schema file copied verbatim into the bundle. Read source-level channel, parameter, process, and test-fixture evidence before choosing Galaxy workflow inputs and outputs.

## Load On Demand

- `references/notes/galaxy-sample-sheet-collections.md`: Research note copied verbatim into the bundle. Pick the right sample_sheet variant and translate nf-schema column metadata into Galaxy column_definitions when the source pipeline uses sample-sheet-shaped inputs. Use when: the Nextflow summary reports a samplesheetToList materialization, a parameter whose nf-schema entry sets schema: assets/schema_*.json, or a channel built from splitCsv(header: true) over a tabular params input.
- `references/notes/galaxy-workflow-testability-design.md`: Research note copied verbatim into the bundle. Choose stable workflow input/output labels and promoted checkpoint outputs that future tests can address. Use when: deciding labels, public outputs, checkpoint outputs, or fixture-compatible collection inputs.
- `references/notes/nextflow-reference-data-classification.md`: Research note copied verbatim into the bundle. Cross-check source-side reference-data classifications before translating the reference-data brief into Galaxy workflow inputs. Use when: the reference-data brief is silent, low-confidence, or conflicts with source evidence for iGenomes-derived params, coordinated bundles, compute-if-missing branches, multi-DB pick-lists, or cohort-specific assets.
- `references/notes/nextflow-to-galaxy-reference-data-mapping.md`: Research note copied verbatim into the bundle. Translate iGenomes-style and per-asset reference-data params into Galaxy inputs without inheriting nf-core's reference-resolution magic; v1 posture is explicit optional inputs with in-tool rebuild on absence. Use when: the source pipeline declares iGenomes-derived params (params.genome with getGenomeAttribute), per-asset reference path params (fasta, fasta_fai, dict, bwa_index, dbsnp, known_indels, intervals, pon), or any compute-if-missing index-building branch in the source.

## Validation

- None declared.

## Procedure

Read a Nextflow summary and emit a reviewable Markdown interface brief for a Galaxy workflow. Capture workflow inputs, workflow outputs, labels, Galaxy collection shapes, checkpoint outputs worth exposing for tests, source-summary provenance, confidence, and open questions.

The output is not a gxformat2 skeleton and not a workflow schema. It is a design handoff consumed by nextflow-summary-to-galaxy-data-flow, nextflow-summary-to-galaxy-template, and later test-plan work.

Carry the open-requirements-ledger through this step: read the open entries that bear on the choices you make here, mark resolved any your decisions close, and append any new unmet need you surface — a declared output with no producer, an unpinned parameter, a tool with no corpus exemplar — so a later skill inherits it instead of re-deriving it.

## Runtime Notes

- Do not read Foundry source files at runtime; use only files packaged in this skill bundle and user-supplied artifacts.
- Preserve declared artifact filenames unless the user or harness supplies explicit paths.
- Carry unresolved assumptions into the output artifact instead of silently inventing missing source evidence.
