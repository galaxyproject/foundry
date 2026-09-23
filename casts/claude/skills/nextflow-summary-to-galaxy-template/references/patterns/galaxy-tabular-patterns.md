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
  - target/galaxy
  - topic/galaxy-transform
  - topic/tabular-transform
status: draft
created: 2026-05-02
revised: 2026-09-22
revision: 2
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
  - "[[freeform-summary-to-galaxy-template]]"
  - "[[compare-against-iwc-exemplar]]"
---

# Galaxy: tabular patterns

Choose by the shape of the input and the result you need. These patterns treat table columns as values, even when a column contains coordinates or sequence text. For coordinate-aware operations use [[galaxy-interval-patterns]], and for FASTA records use [[galaxy-sequence-patterns]]. Open the linked operation page for tool parameters and examples. [[iwc-tabular-operations-survey]] records the IWC evidence behind the choices.

## Rows and columns in one table

- [[tabular-filter-by-column-value]] — use `Filter1` for a Python predicate over column positions (`c1`, `c2`, …), such as a status comparison. Set its header handling for the input.
- [[tabular-filter-by-regex]] — use `tp_grep_tool` to keep or drop whole lines by regex, including comment lines. It does not distinguish columns or preserve a header independently of the match. The page covers `Grep1` when header preservation is needed.
- [[tabular-cut-and-reorder-columns]] — use `Cut1` to select existing columns and put them in output order. It does not calculate values.
- [[tabular-compute-new-column]] — use `column_maker` for a row-wise expression that inserts, replaces, or appends a column.

## Combine or summarize tables

- [[tabular-join-on-key]] — align two tables by key with `tp_easyjoin_tool`. For many same-shaped key/value files, the page covers `tp_multijoin_tool`. Choose the missing-value fill to match downstream meaning.
- [[tabular-group-and-aggregate-with-datamash]] — reduce rows by one or more keys with `datamash_ops`, or reduce the whole file without keys. Check whether input order already groups the keys.
- [[tabular-sql-query]] — use `query_tabular` when the operation needs SQL semantics such as a window function, anti-join, named multi-table join, or a combined projection, computation, and filter. Use the simpler operations above for a single predicate, cut, or computed column.

## Text-processing recipes

- [[tabular-prepend-header]] — add a fixed first line with awk, accounting for any existing header.
- [[tabular-synthesize-bed-from-3col]] — turn chromosome, start, and end columns into six-column BED, including the coordinate conversion and BED datatype.
- [[tabular-split-taxonomy-string]] — expand a semicolon-delimited lineage into rank columns, accounting for missing ranks.
- [[tabular-relabel-by-row-counter]] — generate labels from row order when that order is the intended identity source.

## Between tables and collections

- [[tabular-to-collection-by-row]] — split a manifest or table by row/key into collection elements so the next tool can run over them. Choose a stable, unique identifier column.
- [[tabular-concatenate-collection-to-table]] — stack rows from a collection of tables into one table. Decide whether to retain element identifiers as row provenance and keep only one header.
- [[tabular-pivot-collection-to-wide]] — align a collection of two-column `(id, value)` tables by id into a wide table, with one value column per element. Choose what missing cells mean. For two ordinary tables, use [[tabular-join-on-key]] instead.

## See also

- [[iwc-tabular-operations-survey]] — tabular-operation survey and evidence trail.
- [[galaxy-sequence-patterns]] — companion MOC for sequence-record operations; FASTA↔tabular is the dominant sequence seam.
- [[galaxy-interval-patterns]] — companion MOC for coordinate-feature operations.
- [[galaxy-collection-patterns]] — companion MOC for collection operations.
