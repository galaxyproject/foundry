---
name: nextflow-summary-to-galaxy-data-flow
description: "Translate a Nextflow summary into a Galaxy data-flow design brief."
---

# nextflow-summary-to-galaxy-data-flow

Follow the procedure below and use the artifact/reference sections as the runtime contract.

## When To Use

- Translate a Nextflow summary into a Galaxy data-flow design brief.

## Inputs

- Read artifact `summary-nextflow`. Schema: summary-nextflow. Produced by `summarize-nextflow`. Structured Nextflow pipeline summary emitted by summarize-nextflow; the JSON the data-flow translation reads.
- Read artifact `nextflow-galaxy-reference-data`. Produced by `nextflow-summary-to-galaxy-reference-data`. Reference-data shape brief from nextflow-summary-to-galaxy-reference-data that pins per-asset reference inputs and rebuild-on-absence behavior.
- Read artifact `nextflow-galaxy-interface`. Produced by `nextflow-summary-to-galaxy-interface`. Preceding Galaxy interface brief from nextflow-summary-to-galaxy-interface that pins inputs, outputs, and labels.

## Outputs

- Write artifact `nextflow-galaxy-data-flow` as `nextflow-galaxy-data-flow.md`. Format: `markdown`. Reviewable Markdown brief: abstract operations, collection map/reduce choices, shape-changing placeholder steps, unresolved Galaxy tool needs, confidence, open questions.

## Required Tools

- None declared. Procedure should not assume external CLIs are present.

## Load Upfront

- `references/notes/galaxy-data-flow-draft-contract.md`: Research note copied verbatim into the bundle. Keep the data-flow brief separate from gxformat2 templating and concrete step implementation.
- `references/notes/nextflow-operators-to-galaxy-collection-recipes.md`: Research note copied verbatim into the bundle. Classify Nextflow operators as Galaxy wiring, collection semantics, explicit steps, or review triggers.
- `references/notes/nextflow-to-galaxy-channel-shape-mapping.md`: Research note copied verbatim into the bundle. Translate Nextflow channel, tuple, and path shapes into Galaxy dataset and collection shapes.
- `references/schemas/summary-nextflow.schema.json`: Schema file copied verbatim into the bundle. Read process, channel, operator, and fixture structure while drafting Galaxy-facing abstract data flow.

## Load On Demand

- `references/patterns/galaxy-collection-patterns.md`: Pattern note copied verbatim into the bundle. Ground collection-shape choices in curated, corpus-observed operation and recipe patterns. Use when: selecting collection cleanup, reshape, identifier, or collection-tabular bridge patterns.
- `references/patterns/galaxy-conditionals-patterns.md`: Pattern note copied verbatim into the bundle. Ground conditional-branch and optional-step choices in curated, corpus-observed Galaxy when/pick_value patterns. Use when: data-flow translation needs optional steps, gating on non-empty results, routing between alternative outputs, or transform-or-pass-through branches.
- `references/patterns/galaxy-interval-patterns.md`: Pattern note copied verbatim into the bundle. Ground genomic-interval operation choices in curated, corpus-observed Galaxy interval recipes. Use when: the workflow operates on genomic intervals (BED/GFF/VCF coordinate features) and data-flow translation needs overlap, merge, coverage, windowing, masking, or set-algebra steps.
- `references/patterns/galaxy-tabular-patterns.md`: Pattern note copied verbatim into the bundle. Ground tabular bridge and table-operation choices in curated, corpus-observed operation patterns. Use when: data-flow translation needs filtering, joining, aggregation, pivoting, or tabular-collection bridges.
- `references/notes/galaxy-sample-sheet-collections.md`: Research note copied verbatim into the bundle. Preserve per-row metadata on the data-flow side: keep sample_sheet column_definitions wired through identifier-keyed steps instead of dropping into parallel parameter inputs, and re-attach metadata after map-over steps that lose it. Use when: the upstream interface brief carries a sample_sheet[:paired|:paired_or_unpaired|:record] input, or when the Nextflow summary shows tuple(meta, path...) channel shape originating from samplesheetToList or splitCsv(header: true).
- `references/notes/nextflow-conditional-to-galaxy-subworkflow-when.md`: Research note copied verbatim into the bundle. Decide between subworkflow `when:` and inline tool-step `when:` for each source conditional, and pick the right output fan-in primitive (`pick_value` vs twin-cascade) so the data-flow brief carries a coherent conditional disposition forward. Use when: the Nextflow summary's `workflow.conditionals[]` is non-empty, or when subworkflow boundaries in the source align with parameter-driven branches (step, aligner, wes, tools, skip_*, use_*).
- `references/notes/nextflow-path-glob-to-galaxy-datatype.md`: Research note copied verbatim into the bundle. Preserve datatype confidence while translating path-like data-flow edges, process output patterns, and published outputs. Use when: choosing or reviewing Galaxy datatype extensions for data-flow edges, collection elements, or output datasets.
- `references/notes/nextflow-reference-data-classification.md`: Research note copied verbatim into the bundle. Cross-check source-side reference-data classifications before deciding how reference assets and optional rebuild branches flow through the Galaxy data-flow draft. Use when: the reference-data or interface brief is silent, low-confidence, or conflicts with source evidence for iGenomes-derived params, coordinated bundles, compute-if-missing branches, multi-DB pick-lists, or cohort-specific assets.
- `references/notes/nextflow-to-galaxy-reference-data-mapping.md`: Research note copied verbatim into the bundle. Decide how reference assets and their indexes flow through the Galaxy data-flow draft (preserving dbkey through map-overs, deferring index-building to wrappers vs surfacing as workflow steps). Use when: the upstream interface brief carries reference-data inputs (FASTA, fai, dict, indexes, known sites, intervals, PoN) or when the source pipeline's compute-if-missing branches imply rebuild semantics the data flow has to honor.

## Validation

- None declared.

## Procedure

Read a Nextflow summary plus the preceding Galaxy interface brief and emit a reviewable Markdown data-flow brief. Capture abstract operations, collection map/reduce choices, shape-changing placeholder transformations, unresolved Galaxy tool needs, confidence, and open questions.

The output is not gxformat2 and should not resolve exact Tool Shed tools. nextflow-summary-to-galaxy-template turns this handoff and the interface brief into a skeleton.

## Runtime Notes

- Do not read Foundry source files at runtime; use only files packaged in this skill bundle and user-supplied artifacts.
- Preserve declared artifact filenames unless the user or harness supplies explicit paths.
- Carry unresolved assumptions into the output artifact instead of silently inventing missing source evidence.
