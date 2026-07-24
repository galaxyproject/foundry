---
type: pattern
pattern_kind: operation
evidence: corpus-observed
title: "Tabular: cut and reorder columns"
tags:
  - target/galaxy
status: draft
created: 2026-04-30
revised: 2026-05-03
revision: 2
ai_generated: true
summary: "Use Cut1 with a comma-separated cN list to project — and reorder — columns. Listing out of order is the canonical reorder idiom."
related_notes:
  - "[[iwc-tabular-operations-survey]]"
  - "[[nextflow-to-galaxy-channel-shape-mapping]]"
related_patterns:
  - "[[tabular-compute-new-column]]"
  - "[[tabular-sql-query]]"
related_molds:
  - "[[implement-galaxy-tool-step]]"
iwc_exemplars:
  - workflow: sars-cov-2-variant-calling/sars-cov-2-variation-reporting/variation-reporting
    steps:
      - label: "Long projection and reorder with c20 last"
      - label: "Sibling Cut1 steps with different column lists"
    why: "Shows pure projection and reordering with long explicit column lists."
    confidence: high
  - workflow: genome_annotation/functional-annotation/functional-annotation-of-sequences/Functional_annotation_of_sequences
    why: "Shows a legacy Paste1 plus Cut1 chain that should usually be replaced by column_maker for new work."
    confidence: medium
---

# Tabular: cut and reorder columns

## Tool

`Cut1` (Galaxy core; bundled, no toolshed owner). Display name "Cut columns from a table". Source: `$GALAXY/tools/filters/cutWrapper.xml`.

## When to reach for it

Project a tabular to a subset of columns, **and/or** reorder existing columns. By far the most-used tabular tool in the IWC corpus (127 step occurrences in the survey). Use `Cut1` when the operation is purely "pick columns" — no computation, no row filtering, no aggregation.

For project + compute fused, see [[tabular-sql-query]] or [[tabular-compute-new-column]].

## Parameters

- `columnList`: a single comma-separated string of `cN` references — e.g. `c4,c6,c7`. Range syntax `c2-c5` is also accepted (per the tool's tests). **Order matters**: the output column order is the list order, so listing columns out of input order *reorders* them. The IWC corpus uses long enumerations rather than ranges; either is valid.
- `delimiter`: select enum from the wrapper. Values: `T` (Tab), `Sp` (Whitespace — collapses runs), `Dt` (Dot), `C` (Comma), `D` (Dash), `U` (Underscore), `P` (Pipe). Tab dominates the corpus; always set explicitly.
- The connected `input` port is the tabular dataset.

## Idiomatic shapes

Pure projection (preserve order, drop unwanted columns):

```yaml
tool_id: Cut1
tool_state:
  columnList: c1,c2,c5
  delimiter: T
```

Projection + reorder in one step (note `c20` placed *after* `c26,c24,c25`):

```yaml
tool_id: Cut1
tool_state:
  columnList: c4,c6,c7,c13,c14,c15,c16,c17,c18,c19,c21,c22,c23,c26,c24,c25,c20
  delimiter: T
```

Anchored by the SARS-CoV-2 variation reporting IWC exemplar.

## Pitfalls

- **No header awareness.** The header row is cut and reordered identically to data rows. Usually what you want; flagging only because `Filter1` / `Grouping1` *do* take `header_lines`.
- **`delimiter` must match the input.** Mismatched delimiter (e.g. `delimiter: T` on comma-separated input) treats each line as a single field — `c1` echoes the whole row, `c2…` produce a `.` (the wrapper's missing-column fill) per row. Silent.
- **Cut breaks Galaxy column metadata.** The wrapper warns: re-cutting may invalidate column-assignment metadata (chrom/start/end for interval/BED). Re-establish via the dataset's "edit attributes" if downstream tools need it.
- **Reorder-then-rename** is *not* `Cut1`'s job. Renaming columns means rewriting the header row — handle that with [[tabular-compute-new-column]] or with a `tp_replace_in_line` pass.
- **Adding a constant column** belongs to [[tabular-compute-new-column]] (`column_maker/Add_a_column1`), not `Cut1` + `Paste1`. The latter is legacy.

## Legacy alternative

None for `Cut1` itself — it is the modern tool. The legacy *idiom* of "add a constant column with `Paste1` then re-`Cut1`" survives but should be replaced by `column_maker/Add_a_column1` (see [[tabular-compute-new-column]]).

## See also

- [[iwc-tabular-operations-survey]] — corpus survey and decision record.
- [[tabular-compute-new-column]] — when projection needs to add or replace a column.
- [[tabular-sql-query]] — project + compute fused via `query_tabular`.
