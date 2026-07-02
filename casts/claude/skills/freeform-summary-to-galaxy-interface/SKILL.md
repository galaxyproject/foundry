---
name: freeform-summary-to-galaxy-interface
description: "Map a free-form source summary into a Galaxy workflow interface design brief."
---

# freeform-summary-to-galaxy-interface

Follow the procedure below and use the artifact/reference sections as the runtime contract.

## When To Use

- Map a free-form source summary into a Galaxy workflow interface design brief.

## Inputs

- Read artifact `freeform-summary`. Produced by `interview-to-freeform-summary`, `summarize-paper`. Free-form source summary emitted by summarize-paper or interview-to-freeform-summary; methods, tools, sample data, references, and workflow intent with explicit uncertainty.
- Read artifact `open-requirements-ledger`. Produced by `advance-galaxy-draft-step`, `apply-galaxy-workflow-changeset`, `compare-against-iwc-exemplar`, `cwl-summary-to-galaxy-data-flow`, `cwl-summary-to-galaxy-interface`, `cwl-summary-to-galaxy-template`, `freeform-summary-to-galaxy-data-flow`, `freeform-summary-to-galaxy-interface`, `freeform-summary-to-galaxy-template`, `implement-galaxy-tool-step`, `interview-to-galaxy-workflow-changeset`, `nextflow-summary-to-galaxy-data-flow`, `nextflow-summary-to-galaxy-interface`, `nextflow-summary-to-galaxy-reference-data`, `nextflow-summary-to-galaxy-template`, `repair-galaxy-draft-topology`. Carried obligations ledger open-requirements-ledger: read prior open entries; this design step appends new unmet needs and marks ones its decisions resolve.

## Outputs

- Write artifact `freeform-galaxy-interface` as `freeform-galaxy-interface.md`. Format: `markdown`. Reviewable Markdown brief: Galaxy workflow inputs, outputs, labels, collection shapes, checkpoint outputs, source-summary provenance, confidence, open questions.
- Write artifact `open-requirements-ledger` as `open-requirements.ledger.yml`. Format: `yaml`. Updated obligations ledger: new unmet needs this step surfaces appended; prior entries its decisions close marked resolved.

## Required Tools

- None declared. Procedure should not assume external CLIs are present.

## Load Upfront

- `references/notes/open-requirements-ledger.md`: Research note copied verbatim into the bundle. Carry the open-requirements ledger: read open entries bearing on this step's decisions, mark resolved the ones it closes, and append any new unmet need it surfaces.

## Load On Demand

- `references/notes/galaxy-collection-semantics.md`: Research note copied verbatim into the bundle. Choose Galaxy collection input shapes (File / list / paired / list:paired / record) from the source's per-sample, paired, grouped, or nested data descriptions. Use when: the free-form summary describes paired reads, per-sample groups, nested or grouped inputs, or any input that should become a Galaxy dataset collection.
- `references/notes/galaxy-collection-semantics.upstream.myst`: Companion file copied verbatim into the bundle. Sibling of `references/notes/galaxy-collection-semantics.md`; read it where that note directs.
- `references/notes/galaxy-collection-semantics.yml`: Companion file copied verbatim into the bundle. Sibling of `references/notes/galaxy-collection-semantics.md`; read it where that note directs.
- `references/notes/galaxy-sample-sheet-collections.md`: Research note copied verbatim into the bundle. Pick the right sample_sheet variant and translate described per-sample column metadata into Galaxy column_definitions when the source describes sample-sheet-shaped inputs. Use when: the free-form summary describes a sample sheet, a per-sample/per-record table, or any table mapping samples to files that should become a Galaxy collection or sample-sheet input.
- `references/notes/galaxy-workflow-testability-design.md`: Research note copied verbatim into the bundle. Choose stable workflow input/output labels and promoted checkpoint outputs that future tests can address. Use when: deciding labels, public outputs, checkpoint outputs, or fixture-compatible collection inputs.

## Validation

- None declared.

## Procedure

Read a free-form source summary and emit a reviewable Markdown interface brief for a Galaxy workflow. Capture workflow inputs, workflow outputs, labels, Galaxy collection shapes, checkpoint outputs worth exposing for tests, source-summary provenance, confidence, and open questions.

Free-form sources are narrative- or interview-derived and carry explicit uncertainty. Translate what the summary supports into interface decisions; carry unresolved interface choices forward as open questions rather than inventing precise inputs, outputs, or labels.

The output is not a gxformat2 skeleton and not a workflow schema. It is a design handoff consumed by freeform-summary-to-galaxy-data-flow, freeform-summary-to-galaxy-template, and later test-plan work.

Carry the open-requirements-ledger through this step: read the open entries that bear on the choices you make here, mark resolved any your decisions close, and append any new unmet need you surface — a declared output with no producer, an unpinned parameter, a tool with no corpus exemplar — so a later skill inherits it instead of re-deriving it.

## Runtime Notes

- Do not read Foundry source files at runtime; use only files packaged in this skill bundle and user-supplied artifacts.
- Preserve declared artifact filenames unless the user or harness supplies explicit paths.
- Carry unresolved assumptions into the output artifact instead of silently inventing missing source evidence.
