---
type: pattern
pattern_kind: operation
evidence: corpus-and-verified
title: "Tabular: SQL query"
tags:
  - target/galaxy
status: draft
created: 2026-05-02
revised: 2026-10-01
revision: 3
summary: "Load tabular datasets into Query Tabular for SQL joins, window calculations, and queries that combine several tabular operations."
verification_paths:
  - verification/workflows/tabular-sql-query/sql-query.gxwf-test.yml
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
    why: "Uses a single-table SUM window function for relative abundance after input line filtering."
    confidence: high
  - workflow: amplicon/amplicon-mgnify/mgnify-amplicon-pipeline-v5-rrna-prediction/mgnify-amplicon-pipeline-v5-rrna-prediction
    why: "Shows one input with a main query and additional query outputs."
    confidence: high
  - workflow: proteomics/clinicalmp/clinicalmp-verification/clinicalmp-verification
    why: "Joins two named input tables and selects columns from each."
    confidence: high
  - workflow: proteomics/clinicalmp/clinicalmp-discovery/iwc-clinicalmp-discovery-workflow
    why: "Excludes rows using a three-table query after skipping headers, numbering lines, and normalizing a list column."
    confidence: high
---

# Tabular: SQL query

`query_tabular` loads one or more tabular datasets into SQLite, runs a `SELECT` query, and writes tabular results. Choose it when the result needs SQL operations such as a window calculation, a join with additional predicates, or a query that combines filtering, grouping, and projection. For a single row predicate, cut, or computed column, the corresponding [[tabular-filter-by-column-value|filter]], [[tabular-cut-and-reorder-columns|cut]], or [[tabular-compute-new-column|compute]] pattern is usually easier to inspect. [[tabular-join-on-key]] covers joins that do not need a SQL query.

The example workflow uses `toolshed.g2.bx.psu.edu/repos/iuc/query_tabular/query_tabular/3.3.2` and pins its Tool Shed changeset. Keep the version and changeset together when adapting the example.

## Load tables, then query them

Each `tables` entry connects a tabular dataset. The first unnamed table becomes `t1`, the second `t2`, and so on. Set `tbl_opts.table_name` when names make a multi-table query easier to read. Columns default to `c1`, `c2`, and so on. `tbl_opts.col_names` assigns names by position. For example, `sample,amount` gives those names to the first two columns. A blank position retains its `cN` name. With `load_named_columns: false`, all columns load under those names. Set it to `true` only when the query should load the columns explicitly named in `col_names`.

Input headers and output headers are independent:

| Setting | Effect |
| --- | --- |
| `tables[].input_opts.linefilters` with `skip` | Removes leading input lines before loading. Use `skip_lines: "1"` for a conventional header that should not become a data row. |
| `tables[].tbl_opts.column_names_from_first_line` | Takes column names from the input's first line. Use this **instead of** skipping that line when its names are suitable for SQLite. |
| `tables[].tbl_opts.col_names` | Supplies column names by position, whether or not the input has a header. It does not remove the input header row. |
| `query_result.header` | `"yes"` writes a header for the **main result** from selected column names or aliases. `"no"` omits it. `header_prefix`, when set, prefixes that output header with the selected character. |

The `header` select values are strings. Quote `"yes"` and `"no"` in YAML so they do not become booleans. Set `ORDER BY` when output order matters. An unordered SQL result has no promised row order, even if the input files are ordered.

## Example: join and calculate within groups

The complete workflow under `verification/workflows/tabular-sql-query/` accepts a `counts` table (`sample`, `amount`) and a `cohorts` table (`sample`, `cohort`). It skips both input header rows, names the loaded tables and columns, and joins by sample. The `SUM(...) OVER (PARTITION BY ...)` denominator is computed per cohort, so samples A and B share a denominator while C gets its own. The `100.0` keeps the division fractional.

```sql
SELECT counts.sample, cohorts.cohort, counts.amount,
       ROUND(100.0 * counts.amount /
             SUM(counts.amount) OVER (PARTITION BY cohorts.cohort), 1) AS percent
FROM counts JOIN cohorts ON counts.sample = cohorts.sample
ORDER BY counts.sample
```

With amounts A=2, B=3, C=5 and cohorts A=x, B=x, C=y, the output is:

```text
sample  cohort  amount  percent
A       x       2       40.0
B       x       3       60.0
C       y       5       100.0
```

The Planemo test in `verification_paths` checks this output byte for byte, including its header and order. Its README gives the command used for the local run. A failed comparison can reveal an imported header row, the wrong join multiplicity, an incorrect window partition, or an unexpected output header.

## Input filters and additional results

Line filters run in the listed order **before** SQLite receives rows. A `comment` filter with `comment_char: "35"` excludes lines beginning with `#`. `prepend_dataset_name` and `prepend_line_num` add columns, so later `cN` positions shift. `normalize` expands a delimited list into rows, which can also change join multiplicity. Check the post-filter table shape before writing the query. The [MAPseq workflow](https://github.com/galaxyproject/iwc/blob/deafc4876f2c778aaf075e48bd8e95f3604ccc92/workflows/amplicon/amplicon-mgnify/mapseq-to-ampvis2/mapseq-to-ampvis2.ga) filters comment lines and prepends the dataset name before its relative-abundance window query. The [clinical discovery workflow](https://github.com/galaxyproject/iwc/blob/deafc4876f2c778aaf075e48bd8e95f3604ccc92/workflows/proteomics/clinicalmp/clinicalmp-discovery/iwc-clinicalmp-discovery-workflow.ga) skips a header, prepends line numbers, normalizes protein lists, and uses indexes for its exclusion query.

`sqlquery` produces the main `output`. Up to three `addqueries.queries` can produce `output1`, `output2`, and `output3`, each with its own `query_result` header setting. `save_db` can also expose the SQLite database as `sqlitedb`. Check all declared workflow outputs before treating a step as a single-result query. The [MGnify rRNA workflow](https://github.com/galaxyproject/iwc/blob/deafc4876f2c778aaf075e48bd8e95f3604ccc92/workflows/amplicon/amplicon-mgnify/mgnify-amplicon-pipeline-v5-rrna-prediction/mgnify-amplicon-pipeline-v5-rrna-prediction.ga) demonstrates additional queries.

## Check the result

A successful tool job does not establish that a join or window calculation is correct. In a small fixture, assert the header, selected columns, row count, representative values, and duplicate-key behavior. If a query divides by an aggregate, include a group with a different denominator, as the fixture above does. A `NULL` denominator or a missing join key needs an explicit policy in the SQL and expected output.

The [Query Tabular wrapper](https://github.com/galaxyproject/tools-iuc/blob/master/tools/query_tabular/query_tabular.xml) defines the inputs and output names. Its [macros](https://github.com/galaxyproject/tools-iuc/blob/master/tools/query_tabular/macros.xml) define line filters and header settings. See [[iwc-tabular-operations-survey]] for the pinned corpus inventory and [[tabular-join-on-key]] for a comparison with dedicated join tools.
