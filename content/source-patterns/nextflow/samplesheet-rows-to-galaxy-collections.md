---
type: source-pattern
title: "Nextflow: samplesheet rows to Galaxy collections"
source: nextflow
target: galaxy
source_pattern_kind: channel-shape
implemented_by_patterns:
  - "[[manifest-to-mapped-collection-lifecycle]]"
  - "[[tabular-to-collection-by-row]]"
  - "[[collection-build-list-paired-with-apply-rules]]"
  - "[[galaxy-collection-patterns]]"
review_triggers:
  - "Samplesheet row identity is not unique or stable."
  - "Rows encode both single-end and paired-end reads."
  - "Paired roles need regex normalization before Galaxy construction."
  - "Metadata fields drive downstream parameters, grouping, or branching."
  - "Rows encode multiple files that are not paired reads."
  - "fromSamplesheet or splitCsv logic mutates the row shape."
tags:
  - source/nextflow
  - target/galaxy
status: draft
created: 2026-05-04
revised: 2026-05-04
revision: 1
ai_generated: true
related_notes:
  - "[[nextflow-patterns]]"
summary: "Route Nextflow samplesheet row streams and repeated tuple inputs to Galaxy list, paired, or list:paired collections."
---

# Nextflow: samplesheet rows to Galaxy collections

Use this when the source evidence is a samplesheet or manifest reader that emits repeated channel records such as `tuple(meta, path(reads))`.

## Source idiom

- `val(meta)` carries identity and attributes; it is not itself a Galaxy dataset.
- Repeated `tuple(meta, path(file))` usually maps to a Galaxy `list` collection.
- Repeated `tuple(meta, [R1, R2])` usually maps to `list:paired`.
- One standalone pair may be `paired`, but repeated samples should stay `list:paired`.

## Galaxy target choice

| Source row payload | Galaxy shape | Implementation route |
| --- | --- | --- |
| One file per row | `list` | [[tabular-to-collection-by-row]] or direct collection input |
| Forward/reverse reads per row | `list:paired` | [[collection-build-list-paired-with-apply-rules]] |
| One pair total | `paired` | Direct paired input or paired collection construction |
| Mixed single/paired rows | split collections or review | source review trigger |
| Extra non-read files | parallel collections or review | source review trigger |

## Implementation route

1. Preserve stable sample identity from the row metadata.
2. Decide collection type from file payload shape, not from metadata object shape alone.
3. If the source starts as a tabular manifest, use [[tabular-to-collection-by-row]].
4. If pairedness is encoded in columns or identifiers, use [[collection-build-list-paired-with-apply-rules]].
5. If the workflow maps domain tools per row, use [[manifest-to-mapped-collection-lifecycle]].
6. After mapped steps, relabel, reshape, or sync only as needed through [[galaxy-collection-patterns]].

## Evidence posture

This page is grounded in existing Foundry research notes, especially [[nextflow-to-galaxy-channel-shape-mapping]] and [[iwc-map-over-lifecycle-survey]]. Generated Nextflow fixtures were not present during authoring, so do not treat this page as direct fixture evidence.
