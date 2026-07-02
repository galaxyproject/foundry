---
name: freeform-summary-to-galaxy-data-flow
description: "Translate a free-form source summary into a Galaxy data-flow design brief."
---

# freeform-summary-to-galaxy-data-flow

Follow the procedure below and use the artifact/reference sections as the runtime contract.

## When To Use

- Translate a free-form source summary into a Galaxy data-flow design brief.

## Inputs

- Read artifact `freeform-summary`. Produced by `interview-to-freeform-summary`, `summarize-paper`. Free-form source summary emitted by summarize-paper or interview-to-freeform-summary; consumed alongside the Galaxy interface brief.
- Read artifact `freeform-galaxy-interface`. Produced by `freeform-summary-to-galaxy-interface`. Preceding Galaxy interface brief from freeform-summary-to-galaxy-interface that pins inputs, outputs, and labels.
- Read artifact `open-requirements-ledger`. Produced by `advance-galaxy-draft-step`, `apply-galaxy-workflow-changeset`, `compare-against-iwc-exemplar`, `cwl-summary-to-galaxy-data-flow`, `cwl-summary-to-galaxy-interface`, `cwl-summary-to-galaxy-template`, `freeform-summary-to-galaxy-data-flow`, `freeform-summary-to-galaxy-interface`, `freeform-summary-to-galaxy-template`, `implement-galaxy-tool-step`, `interview-to-galaxy-workflow-changeset`, `nextflow-summary-to-galaxy-data-flow`, `nextflow-summary-to-galaxy-interface`, `nextflow-summary-to-galaxy-reference-data`, `nextflow-summary-to-galaxy-template`, `repair-galaxy-draft-topology`. Carried obligations ledger open-requirements-ledger: read prior open entries; this design step appends new unmet needs and marks ones its decisions resolve.

## Outputs

- Write artifact `freeform-galaxy-data-flow` as `freeform-galaxy-data-flow.md`. Format: `markdown`. Reviewable Markdown brief: abstract operations, collection map/reduce choices, shape-changing placeholder steps, unresolved Galaxy tool needs, confidence, open questions.
- Write artifact `open-requirements-ledger` as `open-requirements.ledger.yml`. Format: `yaml`. Updated obligations ledger: new unmet needs this step surfaces appended; prior entries its decisions close marked resolved.

## Required Tools

- None declared. Procedure should not assume external CLIs are present.

## Load Upfront

- `references/notes/galaxy-data-flow-draft-contract.md`: Research note copied verbatim into the bundle. Keep the data-flow brief separate from gxformat2 templating and concrete step implementation.
- `references/notes/open-requirements-ledger.md`: Research note copied verbatim into the bundle. Carry the open-requirements ledger: read open entries bearing on this step's decisions, mark resolved the ones it closes, and append any new unmet need it surfaces.

## Load On Demand

- `references/patterns/galaxy-collection-patterns.md`: Pattern note copied verbatim into the bundle. Ground collection-shape choices in curated, corpus-observed operation and recipe patterns. Use when: selecting collection cleanup, reshape, identifier, or collection-tabular bridge patterns.
- `references/patterns/galaxy-conditionals-patterns.md`: Pattern note copied verbatim into the bundle. Ground conditional-branch and optional-step choices in curated, corpus-observed Galaxy when/pick_value patterns. Use when: data-flow translation needs optional steps, gating on non-empty results, routing between alternative outputs, or transform-or-pass-through branches.
- `references/patterns/galaxy-interval-patterns.md`: Pattern note copied verbatim into the bundle. Ground genomic-interval operation choices in curated, corpus-observed Galaxy interval recipes. Use when: the workflow operates on genomic intervals (BED/GFF/VCF coordinate features) and data-flow translation needs overlap, merge, coverage, windowing, masking, or set-algebra steps.
- `references/patterns/galaxy-tabular-patterns.md`: Pattern note copied verbatim into the bundle. Ground tabular bridge and table-operation choices in curated, corpus-observed operation patterns. Use when: data-flow translation needs filtering, joining, aggregation, pivoting, or tabular-collection bridges.
- `references/notes/galaxy-sample-sheet-collections.md`: Research note copied verbatim into the bundle. Preserve per-row metadata on the data-flow side: keep sample_sheet column_definitions wired through identifier-keyed steps instead of dropping into parallel parameter inputs, and re-attach metadata after map-over steps that lose it. Use when: the interface brief carries a sample_sheet[:paired|:paired_or_unpaired|:record] input, or the free-form summary describes per-sample/per-record metadata that must survive map-over steps.

## Validation

- None declared.

## Procedure

Read a free-form source summary plus the preceding Galaxy interface brief and emit a reviewable Markdown data-flow brief. Capture abstract operations, collection map/reduce choices, shape-changing placeholder transformations, unresolved Galaxy tool needs, confidence, and open questions.

Free-form sources rarely give enough to fix exact operations. Translate what the summary and interface brief support, classify the rest as unresolved tool needs or open questions, and do not present narrative intent as already-decided Galaxy wiring.

The output is not gxformat2 and should not resolve exact Tool Shed tools. freeform-summary-to-galaxy-template turns this handoff and the interface brief into a skeleton.

Carry the open-requirements-ledger through this step: read the open entries that bear on the choices you make here, mark resolved any your decisions close, and append any new unmet need you surface — a declared output with no producer, an unpinned parameter, a tool with no corpus exemplar — so a later skill inherits it instead of re-deriving it.

## Runtime Notes

- Do not read Foundry source files at runtime; use only files packaged in this skill bundle and user-supplied artifacts.
- Preserve declared artifact filenames unless the user or harness supplies explicit paths.
- Carry unresolved assumptions into the output artifact instead of silently inventing missing source evidence.
