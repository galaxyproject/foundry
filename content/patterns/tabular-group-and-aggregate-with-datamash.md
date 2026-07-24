---
type: pattern
pattern_kind: operation
evidence: corpus-observed
title: "Tabular: group and aggregate"
tags:
  - target/galaxy
status: draft
created: 2026-05-02
revised: 2026-05-03
revision: 2
ai_generated: true
summary: "Use datamash_ops for grouped tabular aggregation: multi-column grouping, collapse, countunique, min/max, and reductions."
related_notes:
  - "[[iwc-tabular-operations-survey]]"
  - "[[nextflow-to-galaxy-channel-shape-mapping]]"
related_patterns:
  - "[[tabular-compute-new-column]]"
  - "[[tabular-sql-query]]"
  - "[[tabular-join-on-key]]"
related_molds:
  - "[[implement-galaxy-tool-step]]"
iwc_exemplars:
  - workflow: sars-cov-2-variant-calling/sars-cov-2-variation-reporting/variation-reporting
    steps:
      - label: "Grouped collapse with regex cleanup"
      - label: "Grouped countunique, min, and max"
      - label: "Single countunique operation"
    why: "Shows multi-column grouping, grouped summaries, and cleanup after collapsed datamash output."
    confidence: high
  - workflow: VGP-assembly-v2/Purge-duplicates-one-haplotype-VGP6b/Purging-duplicates-one-haplotype-VGP6b
    why: "Shows whole-file absmax reduction with no grouping."
    confidence: high
  - workflow: microbiome/pathogen-identification/pathogen-detection-pathogfair-samples-aggregation-and-visualisation/Pathogen-Detection-PathoGFAIR-Samples-Aggregation-and-Visualisation
    why: "Shows legacy Grouping1 occurrences preserved as inherited workflow context."
    confidence: medium
---

# Tabular: group and aggregate

## Tool

`toolshed.g2.bx.psu.edu/repos/iuc/datamash_ops/datamash_ops` ("Datamash"). 73 step occurrences in the surveyed IWC corpus across pins including `1.1.0`, `1.8+galaxy0`, and `1.9+galaxy0`. This is the canonical grouped aggregation path; `Grouping1` is the legacy alternative.

## When to reach for it

Use `datamash_ops` when rows need to be grouped by one or more columns and summarized with aggregate operations such as `collapse`, `countunique`, `min`, `max`, or whole-file reductions.

For SQL windows or joins, use [[tabular-sql-query]]. For simple row filtering, use [[tabular-filter-by-column-value]] or [[tabular-filter-by-regex]]. For simple computed columns, use [[tabular-compute-new-column]].

## Parameters

- `grouping`: comma-separated string of 1-indexed key columns, e.g. `"3"` or `1,2,3,4,5`. Empty string means whole-file aggregate.
- `operations`: repeat list of `{ op_name, op_column }` entries. Corpus operations include `collapse`, `countunique`, `min`, `max`, and `absmax`.
- `header_in`: whether the input has a header row.
- `header_out`: whether the output includes aggregate headers.
- `need_sort`: whether datamash should sort/group by the key before aggregating. Correctness-significant when upstream order is not guaranteed.
- `narm`: ignore/remove NA values when true.
- `ignore_case`: case-insensitive grouping when true.
- `print_full_line`: false in the corpus examples surveyed.
- `in_file`: connected tabular input.

## Idiomatic shapes

Collapse many value columns by many key columns:

```yaml
tool_id: toolshed.g2.bx.psu.edu/repos/iuc/datamash_ops/datamash_ops/1.8+galaxy0
tool_state:
  grouping: 1,2,3,4,5,6,7,8,9,10
  header_in: true
  header_out: true
  ignore_case: false
  in_file: { __class__: ConnectedValue }
  narm: false
  need_sort: false
  operations:
    - op_name: collapse
      op_column: "11"
    - op_name: collapse
      op_column: "12"
    - op_name: collapse
      op_column: "13"
    - op_name: collapse
      op_column: "14"
    - op_name: collapse
      op_column: "15"
    - op_name: collapse
      op_column: "16"
    - op_name: collapse
      op_column: "17"
  print_full_line: false
```

Anchored by the SARS-CoV-2 variation reporting IWC exemplar.

Grouped multi-stat summary in one pass:

```yaml
tool_id: toolshed.g2.bx.psu.edu/repos/iuc/datamash_ops/datamash_ops/1.8+galaxy0
tool_state:
  grouping: "3"
  header_in: true
  header_out: true
  ignore_case: false
  in_file: { __class__: ConnectedValue }
  narm: false
  need_sort: true
  operations:
    - op_name: countunique
      op_column: "1"
    - op_name: min
      op_column: "8"
    - op_name: max
      op_column: "8"
    - op_name: countunique
      op_column: "19"
    - op_name: countunique
      op_column: "13"
  print_full_line: false
```

Anchored by the SARS-CoV-2 variation reporting IWC exemplar.

## Pitfalls

- **`grouping` is a string, not a YAML list.** Multi-column grouping is `1,2,3`, not `[1, 2, 3]`.
- **`need_sort` matters.** Grouped datamash requires grouped/sorted input unless upstream already guarantees key order. Corpus examples use both `true` and `false`; choose deliberately.
- **Header toggles are independent.** `header_in: true` consumes a header; `header_out: true` emits aggregate labels. Wrong settings shift data/header expectations downstream.
- **`collapse` is not `first`.** The SARS-CoV-2 workflow collapses values, then uses `tp_find_and_replace` to keep the first comma-delimited member. That regex group count must match the collapsed column count.
- **Datamash-generated headers may need cleanup.** Surveyed workflows strip labels such as `GroupBy(...)` and `collapse(...)` downstream.
- **Empty `grouping: ""` is a whole-file aggregate.** Valid, but a different operation than grouped summary.
- **Version pins vary.** Prefer the newest available pin in the workflow context; do not downgrade just to match an old exemplar.

## Legacy alternative

`Grouping1` (Galaxy core; display name "Group data by a column") survives in older microbiome workflows. Preserve it when reading old workflows, but prefer `datamash_ops` for new authoring.

Distinguishing fields: `groupcol`, `ignorecase`, `ignorelines`, `operations[].optype`, `operations[].opcol`, `operations[].opround`, and `operations[].opdefault`. Do not translate `Grouping1.operations[].optype` directly into datamash without checking names; datamash uses `op_name`.

Anchored by the PathoGFAIR sample aggregation IWC exemplar.

## See also

- [[iwc-tabular-operations-survey]] — corpus survey and §7 legacy-tool decision.
- [[tabular-sql-query]] — SQL windows, joins, and anti-joins.
- [[tabular-join-on-key]] — ordinary key joins before/after aggregation.
- [[tabular-compute-new-column]] — per-row computations before aggregation.
