---
type: pattern
pattern_kind: operation
evidence: corpus-observed
title: "Tabular: pivot collection to wide"
aliases:
  - "collection-to-wide-table-with-collection_column_join"
tags:
  - target/galaxy
status: draft
created: 2026-05-02
revised: 2026-05-03
revision: 2
ai_generated: true
summary: "Use collection_column_join to outer-join a collection of 2-column id/value tables into one wide table."
related_notes:
  - "[[iwc-tabular-operations-survey]]"
  - "[[nextflow-to-galaxy-channel-shape-mapping]]"
related_patterns:
  - "[[tabular-join-on-key]]"
  - "[[tabular-concatenate-collection-to-table]]"
related_molds:
  - "[[implement-galaxy-tool-step]]"
iwc_exemplars:
  - workflow: amplicon/amplicon-mgnify/mapseq-to-ampvis2/mapseq-to-ampvis2
    why: "Pivots a headerless id/value collection to a wide table with zero fill and element identity in headers."
    confidence: high
  - workflow: microbiome/mags-building/MAGs-generation
    why: "Shows repeated metric pivots over headered inputs with missing values represented as dots."
    confidence: high
  - workflow: microbiome/mag-genome-annotation-parallel/MAG-Genome-Annotation-Parallel
    why: "Merges Bakta output through collection_column_join with headered input and element identity in headers."
    confidence: high
  - workflow: microbiome/pathogen-identification/pathogen-detection-pathogfair-samples-aggregation-and-visualisation/Pathogen-Detection-PathoGFAIR-Samples-Aggregation-and-Visualisation
    why: "Shows defensive empty-dataset filtering upstream of collection_column_join."
    confidence: high
---

# Tabular: pivot collection to wide

## Tool

`toolshed.g2.bx.psu.edu/repos/iuc/collection_column_join/collection_column_join/0.0.3`. The tabular survey identifies this as the dominant IWC wide-pivot idiom: a collection of per-element `(identifier, value)` tables becomes one wide table with one row per identifier and one column per collection element.

## When to reach for it

Use this when each collection element is a two-column tabular keyed by the same identifier column, and the desired output is one wide tabular matrix.

Do not use this for ordinary two-file joins; use [[tabular-join-on-key]]. Do not frame it as a generic transpose or pivot-table operation; the survey found no broad `datamash_transpose`-style pattern in IWC.

## Parameters

- `input_tabular`: connected collection of tabular datasets.
- `identifier_column`: 1-indexed key column in each per-element table. Corpus examples usually use `"1"`.
- `fill_char`: value for missing element/key cells. Corpus examples use `"0"` and `.`.
- `has_header`: string toggle, `"0"` / `"1"`, not a boolean.
- `old_col_in_header`: whether collection element / original column identity appears in output headers.
- `include_outputs`: usually `null` in corpus examples.

## Idiomatic shapes

Headerless abundance/count pivot:

```yaml
tool_id: toolshed.g2.bx.psu.edu/repos/iuc/collection_column_join/collection_column_join/0.0.3
tool_state:
  fill_char: "0"
  has_header: "0"
  identifier_column: "1"
  include_outputs: null
  input_tabular: { __class__: ConnectedValue }
  old_col_in_header: true
```

Anchored by the MAPseq-to-ampvis2 IWC exemplar.

Headered metric-table pivot:

```yaml
tool_id: toolshed.g2.bx.psu.edu/repos/iuc/collection_column_join/collection_column_join/0.0.3
tool_state:
  fill_char: .
  has_header: "1"
  identifier_column: "1"
  include_outputs: null
  input_tabular: { __class__: ConnectedValue }
  old_col_in_header: false
```

Anchored by the MAGs generation IWC exemplar.

## Pitfalls

- **Input shape is strict.** This works because upstream emits one `(id, value)` table per collection element. It is not a generic wide/long pivot.
- **Do not substitute ordinary joins.** `collection_column_join` is collection-shaped; use [[tabular-join-on-key]] for two-file key joins.
- **`has_header` is a string.** Corpus YAML uses `"0"` / `"1"`, not booleans.
- **Fill value has meaning.** `"0"` means absent is zero; `.` means missing/unknown. Match downstream semantics.
- **Header semantics matter.** `old_col_in_header: true` preserves element identity in headers; `false` appears in MAG metric pivots.
- **Guard empties when plausible.** The transformations survey flags upstream `__FILTER_EMPTY_DATASETS__` as a defensive guard when per-element outputs may be empty, especially small-N or filter-heavy paths. Do not apply it as universal boilerplate; several IWC pivots do not filter first.

## Legacy alternative

None. This page exists because the corpus has one dominant operation-shaped path. Awk or SQL rewrites would be custom transformations, not the IWC pattern.

## See also

- [[iwc-tabular-operations-survey]] — candidate 8 and §7 operation-anchored naming decision.
- [[iwc-transformations-survey]] — collection-side cross-reference and empty-element guard note.
- [[tabular-join-on-key]] — ordinary two-file key joins.
- [[tabular-concatenate-collection-to-table]] — row-bind a collection into one long table.
