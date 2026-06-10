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

## Outputs

- Write artifact `freeform-galaxy-interface` as `freeform-galaxy-interface.md`. Format: `markdown`. Reviewable Markdown brief: Galaxy workflow inputs, outputs, labels, collection shapes, checkpoint outputs, source-summary provenance, confidence, open questions.

## Required Tools

- None declared. Procedure should not assume external CLIs are present.

## Load Upfront

- None declared.

## Load On Demand

- `references/notes/galaxy-collection-semantics.md`: Research note copied verbatim into the bundle. Choose Galaxy collection input shapes (File / list / paired / list:paired / record) from the source's per-sample, paired, grouped, or nested data descriptions. Use when: the free-form summary describes paired reads, per-sample groups, nested or grouped inputs, or any input that should become a Galaxy dataset collection.
- `references/notes/galaxy-sample-sheet-collections.md`: Research note copied verbatim into the bundle. Pick the right sample_sheet variant and translate described per-sample column metadata into Galaxy column_definitions when the source describes sample-sheet-shaped inputs. Use when: the free-form summary describes a sample sheet, a per-sample/per-record table, or any table mapping samples to files that should become a Galaxy collection or sample-sheet input.
- `references/notes/galaxy-workflow-testability-design.md`: Research note copied verbatim into the bundle. Choose stable workflow input/output labels and promoted checkpoint outputs that future tests can address. Use when: deciding labels, public outputs, checkpoint outputs, or fixture-compatible collection inputs.

## Validation

- None declared.

## Procedure

Read a free-form source summary and emit a reviewable Markdown interface brief for a Galaxy workflow. Capture workflow inputs, workflow outputs, labels, Galaxy collection shapes, checkpoint outputs worth exposing for tests, source-summary provenance, confidence, and open questions.

Free-form sources are narrative- or interview-derived and carry explicit uncertainty. Translate what the summary supports into interface decisions; carry unresolved interface choices forward as open questions rather than inventing precise inputs, outputs, or labels.

The output is not a gxformat2 skeleton and not a workflow schema. It is a design handoff consumed by freeform-summary-to-galaxy-data-flow, freeform-summary-to-galaxy-template, and later test-plan work.

## Runtime Notes

- Do not read Foundry source files at runtime; use only files packaged in this skill bundle and user-supplied artifacts.
- Preserve declared artifact filenames unless the user or harness supplies explicit paths.
- Carry unresolved assumptions into the output artifact instead of silently inventing missing source evidence.
