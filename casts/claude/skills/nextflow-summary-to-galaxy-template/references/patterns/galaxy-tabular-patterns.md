---
type: pattern
pattern_kind: moc
evidence: corpus-observed
title: "Galaxy: tabular patterns"
aliases:
  - "Galaxy tabular pattern MOC"
  - "tabular transformation patterns"
  - "IWC tabular pattern map"
tags:
  - pattern
  - target/galaxy
  - topic/galaxy-transform
  - topic/tabular-transform
status: draft
created: 2026-05-02
revised: 2026-05-02
revision: 1
ai_generated: true
summary: "Use this MOC to choose corpus-grounded Galaxy tabular transformation patterns."
related_notes:
  - "[[iwc-tabular-operations-survey]]"
related_patterns:
  - "[[tabular-filter-by-column-value]]"
  - "[[tabular-filter-by-regex]]"
  - "[[tabular-cut-and-reorder-columns]]"
  - "[[tabular-compute-new-column]]"
  - "[[tabular-join-on-key]]"
  - "[[tabular-group-and-aggregate-with-datamash]]"
  - "[[tabular-sql-query]]"
  - "[[tabular-prepend-header]]"
  - "[[tabular-synthesize-bed-from-3col]]"
  - "[[tabular-split-taxonomy-string]]"
  - "[[tabular-relabel-by-row-counter]]"
  - "[[tabular-to-collection-by-row]]"
  - "[[tabular-concatenate-collection-to-table]]"
  - "[[tabular-pivot-collection-to-wide]]"
related_molds:
  - "[[implement-galaxy-tool-step]]"
  - "[[nextflow-summary-to-galaxy-data-flow]]"
  - "[[cwl-summary-to-galaxy-data-flow]]"
  - "[[nextflow-summary-to-galaxy-template]]"
  - "[[cwl-summary-to-galaxy-template]]"
  - "[[paper-summary-to-galaxy-template]]"
  - "[[compare-against-iwc-exemplar]]"
---

# Galaxy: tabular patterns

This is the runtime-facing map for Galaxy tabular transformation choices. Use it before loading raw survey notes. The survey remains evidence backing; the operation pages are the actionable references.

## Row And Column Operations

- [[tabular-filter-by-column-value]] — keep/drop rows by string column value with `Filter1`.
- [[tabular-filter-by-regex]] — keep/drop rows by regex or pattern matching.
- [[tabular-cut-and-reorder-columns]] — project and reorder columns with `Cut1`.
- [[tabular-compute-new-column]] — compute row-wise values into a new column.

## Joins And Aggregation

- [[tabular-join-on-key]] — join two tabular datasets by key columns.
- [[tabular-group-and-aggregate-with-datamash]] — group and aggregate rows with `datamash_ops`.
- [[tabular-sql-query]] — use SQL when filtering, joining, and projection are clearer as one query.

## Text-Processing Recipes

- [[tabular-prepend-header]] — add a header row with an awk/text-processing step.
- [[tabular-synthesize-bed-from-3col]] — build BED from three-column tabular inputs.
- [[tabular-split-taxonomy-string]] — split taxonomy-like strings into useful columns.
- [[tabular-relabel-by-row-counter]] — synthesize row labels from row order.

## Bridges

- [[tabular-to-collection-by-row]] — split a tabular manifest/list into collection elements for map-over.
- [[tabular-concatenate-collection-to-table]] — row-bind a collection of tabular outputs into one table.
- [[tabular-pivot-collection-to-wide]] — outer-join a collection of id/value tabulars into one wide table.

## See also

- [[iwc-tabular-operations-survey]] — tabular-operation survey and evidence trail.
- [[galaxy-collection-patterns]] — companion MOC for collection operations.
