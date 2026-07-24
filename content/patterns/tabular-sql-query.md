---
type: pattern
pattern_kind: operation
evidence: corpus-observed
title: "Tabular: SQL query"
tags:
  - target/galaxy
status: draft
created: 2026-05-02
revised: 2026-05-03
revision: 2
ai_generated: true
summary: "Use query_tabular when SQL semantics justify it: windows, joins, anti-joins, or fused project+compute over tabulars."
related_notes:
  - "[[iwc-tabular-operations-survey]]"
  - "[[nextflow-to-galaxy-channel-shape-mapping]]"
related_patterns:
  - "[[tabular-filter-by-column-value]]"
  - "[[tabular-filter-by-regex]]"
  - "[[tabular-cut-and-reorder-columns]]"
  - "[[tabular-compute-new-column]]"
  - "[[tabular-join-on-key]]"
related_molds:
  - "[[implement-galaxy-tool-step]]"
iwc_exemplars:
  - workflow: amplicon/amplicon-mgnify/mapseq-to-ampvis2/mapseq-to-ampvis2
    why: "Uses a single-table query with SUM window function for relative abundance."
    confidence: high
  - workflow: amplicon/amplicon-mgnify/mgnify-amplicon-pipeline-v5-rrna-prediction/mgnify-amplicon-pipeline-v5-rrna-prediction
    why: "Shows one input with main query plus multiple addqueries outputs."
    confidence: high
  - workflow: proteomics/clinicalmp/clinicalmp-verification/clinicalmp-verification
    why: "Shows a two-table INNER JOIN with named tables."
    confidence: high
  - workflow: proteomics/clinicalmp/clinicalmp-discovery/iwc-clinicalmp-discovery-workflow
    why: "Shows a three-table anti-join with load filters and indexes."
    confidence: high
---

# Tabular: SQL query

## Tool

`toolshed.g2.bx.psu.edu/repos/iuc/query_tabular/query_tabular/3.3.2` ("Query Tabular"). 16 step occurrences in the surveyed IWC corpus. This is the SQL operation in the tabular hierarchy: powerful, but deliberately narrow.

## When to reach for it

Use `query_tabular` when the operation is genuinely SQL-shaped: window functions, multi-table joins, anti-joins, or fused project + compute + filter over one or more tabular inputs.

For a one-table Python predicate, use [[tabular-filter-by-column-value]]. For whole-line regex filtering, use [[tabular-filter-by-regex]]. For pure projection, use [[tabular-cut-and-reorder-columns]]. For a simple computed column, use [[tabular-compute-new-column]].

## Parameters

- `sqlquery`: main SQL query. Tables are named `t1`, `t2`, ... unless `tables[].tbl_opts.table_name` sets explicit names.
- `query_result.header`: `yes` / `no`; controls whether the main output has a header.
- `tables`: repeat list of inputs to load into SQLite.
- `tables[].table`: connected tabular input.
- `tables[].input_opts.linefilters`: load-time preprocessing before SQLite import. Corpus filters include `comment`, `skip`, `prepend_dataset_name`, `prepend_line_num`, and `normalize`.
- `tables[].tbl_opts.table_name`: optional SQL table name. Blank means default `t1`, `t2`, ...
- `tables[].tbl_opts.column_names_from_first_line`: whether the first row supplies column names.
- `tables[].tbl_opts.col_names`: comma-separated named columns for SQL.
- `tables[].tbl_opts.load_named_columns`: whether to load named columns rather than positional `cN` columns.
- `tables[].tbl_opts.indexes`: optional SQLite indexes for join-heavy queries.
- `addqueries.queries`: optional extra SQL outputs. Check this before assuming `sqlquery` is the only result.
- `workdb`: usually `workdb.sqlite`.

## Idiomatic shapes

Single-table project + compute with a window function:

```yaml
tool_id: toolshed.g2.bx.psu.edu/repos/iuc/query_tabular/query_tabular/3.3.2
tool_state:
  query_result:
    header: no
  sqlquery: |-
    SELECT c1, c2, c3, c3 * 100 / SUM(c3) OVER() AS relative_abundance
    FROM t1;
  tables:
    - table: { __class__: ConnectedValue }
      input_opts:
        linefilters:
          - filter:
              filter_type: comment
              comment_char: "35"
          - filter:
              filter_type: prepend_dataset_name
      tbl_opts:
        table_name: ""
        column_names_from_first_line: false
        col_names: ""
        load_named_columns: false
        indexes: []
  workdb: workdb.sqlite
```

Anchored by the MAPseq-to-ampvis2 IWC exemplar.

Multi-table SQL join with named tables:

```yaml
tool_id: toolshed.g2.bx.psu.edu/repos/iuc/query_tabular/query_tabular/3.3.2
tool_state:
  query_result:
    header: yes
    header_prefix: ""
  sqlquery: |-
    SELECT pep.mpep, prot.prot
    FROM pep
    INNER JOIN prot on pep.mpep=prot.pep
  tables:
    - table: { __class__: ConnectedValue }
      input_opts:
        linefilters: []
      tbl_opts:
        table_name: pep
        column_names_from_first_line: false
        col_names: mpep
        load_named_columns: false
        indexes: []
    - table: { __class__: ConnectedValue }
      input_opts:
        linefilters: []
      tbl_opts:
        table_name: prot
        column_names_from_first_line: false
        col_names: pep,prot
        load_named_columns: false
        indexes: []
  workdb: workdb.sqlite
```

Anchored by the clinical metaproteomics verification IWC exemplar.

## Pitfalls

- **Do not use SQL for simple filters or cuts.** The survey decision keeps this page narrow; simple row predicates and projections have clearer operation pages.
- **Header handling is split across fields.** `query_result.header`, `tables[].tbl_opts.column_names_from_first_line`, and load filters like `skip` are independent.
- **Line filters run before SQL.** `prepend_dataset_name`, `prepend_line_num`, and `normalize` change column positions before the query sees the table.
- **Blank `table_name` is meaningful.** Blank means default `t1`; named joins need explicit table names.
- **`comment_char: "35"` means `#`.** The corpus YAML uses the ASCII code string, not the literal `#`.
- **Extra outputs can hide in `addqueries`.** Some workflows emit multiple query results from one step.
- **Version pins vary.** `3.3.0` and `3.3.2` appear in corpus. Prefer the newest available pin unless preserving an existing workflow.

## See also

- [[iwc-tabular-operations-survey]] — corpus survey and §7 decision record for SQL as a narrow tabular operation.
- [[tabular-filter-by-column-value]] — one-table row predicates.
- [[tabular-cut-and-reorder-columns]] — pure projection.
- [[tabular-compute-new-column]] — simple computed columns.
- [[tabular-join-on-key]] — ordinary key joins without SQL-specific semantics.
