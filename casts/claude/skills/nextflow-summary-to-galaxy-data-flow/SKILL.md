---
name: nextflow-summary-to-galaxy-data-flow
description: "Translate a Nextflow summary into a Galaxy data-flow design brief."
---

# nextflow-summary-to-galaxy-data-flow

This skill was deterministically cast from its Mold. Treat the Mold body below as the procedure and the artifact/reference sections as the runtime contract.

## When To Use

- Translate a Nextflow summary into a Galaxy data-flow design brief.

## Inputs

- `summary-nextflow`; schema: summary-nextflow; producer(s): `summarize-nextflow`; Structured Nextflow pipeline summary emitted by summarize-nextflow; the JSON the data-flow translation reads.
- `nextflow-galaxy-interface`; producer(s): `nextflow-summary-to-galaxy-interface`; Preceding Galaxy interface brief from nextflow-summary-to-galaxy-interface that pins inputs, outputs, and labels.

## Outputs

- `nextflow-galaxy-data-flow`; kind: `markdown`; default filename: `nextflow-galaxy-data-flow.md`; Reviewable Markdown brief: abstract operations, collection map/reduce choices, shape-changing placeholder steps, unresolved Galaxy tool needs, confidence, open questions.

## Load Upfront

- `references/notes/galaxy-data-flow-draft-contract.md`; kind: `research`; mode: `verbatim`; Keep the data-flow brief separate from gxformat2 templating and concrete step implementation.
- `references/notes/nextflow-operators-to-galaxy-collection-recipes.md`; kind: `research`; mode: `verbatim`; Classify Nextflow operators as Galaxy wiring, collection semantics, explicit steps, or review triggers.
- `references/notes/nextflow-to-galaxy-channel-shape-mapping.md`; kind: `research`; mode: `verbatim`; Translate Nextflow channel, tuple, and path shapes into Galaxy dataset and collection shapes.
- `references/schemas/summary-nextflow.schema.json`; kind: `schema`; mode: `verbatim`; Read process, channel, operator, and fixture structure while drafting Galaxy-facing abstract data flow.

## Load On Demand

- `references/patterns/galaxy-collection-patterns.md`; kind: `pattern`; mode: `verbatim`; Ground collection-shape choices in curated, corpus-observed operation and recipe patterns; Trigger: When selecting collection cleanup, reshape, identifier, or collection-tabular bridge patterns.
- `references/patterns/galaxy-tabular-patterns.md`; kind: `pattern`; mode: `verbatim`; Ground tabular bridge and table-operation choices in curated, corpus-observed operation patterns; Trigger: When data-flow translation needs filtering, joining, aggregation, pivoting, or tabular-collection bridges.
- `references/notes/galaxy-sample-sheet-collections.md`; kind: `research`; mode: `verbatim`; Preserve per-row metadata on the data-flow side: keep sample_sheet column_definitions wired through identifier-keyed steps instead of dropping into parallel parameter inputs, and re-attach metadata after map-over steps that lose it; Trigger: When the upstream interface brief carries a sample_sheet[:paired|:paired_or_unpaired|:record] input, or when the Nextflow summary shows tuple(meta, path...) channel shape originating from samplesheetToList or splitCsv(header: true).
- `references/notes/nextflow-path-glob-to-galaxy-datatype.md`; kind: `research`; mode: `verbatim`; Preserve datatype confidence while translating path-like data-flow edges, process output patterns, and published outputs; Trigger: When choosing or reviewing Galaxy datatype extensions for data-flow edges, collection elements, or output datasets.

## Validation

- None declared.

## Procedure

# nextflow-summary-to-galaxy-data-flow

Read a Nextflow summary plus the preceding Galaxy interface brief and emit a reviewable Markdown data-flow brief. Capture abstract operations, collection map/reduce choices, shape-changing placeholder transformations, unresolved Galaxy tool needs, confidence, and open questions.

The output is not gxformat2 and should not resolve exact Tool Shed tools. nextflow-summary-to-galaxy-template turns this handoff and the interface brief into a skeleton.

## Runtime Notes

- Do not read Foundry source files at runtime; use only files packaged in this skill bundle and user-supplied artifacts.
- Preserve declared artifact filenames unless the user or harness supplies explicit paths.
- Carry unresolved assumptions into the output artifact instead of silently inventing missing source evidence.
