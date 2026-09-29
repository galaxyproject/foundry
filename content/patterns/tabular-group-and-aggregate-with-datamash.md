---
type: pattern
pattern_kind: operation
evidence: corpus-observed
title: "Tabular: group and aggregate"
tags:
  - target/galaxy
status: draft
created: 2026-05-02
revised: 2026-09-29
revision: 3
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
    why: "Shows Grouping1 count and concatenate operations in an existing workflow."
    confidence: high
---

# Tabular: group and aggregate

`datamash_ops` reduces rows with the same key to aggregate values. Choose one or more key columns for grouped summaries, or leave the key empty to calculate over the whole file. Its operation list can produce several values per group in one step. The pinned IWC snapshot contains 30 `datamash_ops` steps across 13 workflow files, with pins `1.1.0`, `1.8+galaxy0`, and `1.9+galaxy0`. Those counts describe this snapshot, not which tool version a Galaxy server has installed.

Choose aggregation only when the result should contain one row per key. [[tabular-compute-new-column]] keeps each input row while computing values, [[tabular-join-on-key]] aligns tables by a key, and [[tabular-sql-query]] covers SQL grouping when the query needs its other table or expression features.

## Datamash input and parameters

The tool ID is `toolshed.g2.bx.psu.edu/repos/iuc/datamash_ops/datamash_ops`, followed by the installed version pin. The pinned [wrapper](https://github.com/galaxyproject/tools-iuc/blob/b9b16be49cbe9777b5d1cec3d22a279cfe3e74a7/tools/datamash/datamash-ops.xml) and [input/output macro](https://github.com/galaxyproject/tools-iuc/blob/b9b16be49cbe9777b5d1cec3d22a279cfe3e74a7/tools/datamash/macros.xml) accept a `tabular`, `tsv`, or `csv` dataset and write the same datatype. It requires at least one operation. These are the relevant settings:

| Parameter | Effect |
|---|---|
| `in_file` | Connected input dataset |
| `grouping` | Comma-separated string of one-based key columns, such as `"3"` or `"1,2,3"`. An empty string applies each operation to the whole file |
| `operations` | Repeated `{ op_name, op_column }` pairs. The operation names in the examples include `collapse`, `countunique`, `min`, `max`, and `absmax` |
| `header_in` | Treat the first input line as column names, so it is not aggregated |
| `header_out` | Emit generated names for group and aggregate columns |
| `need_sort` | Sort by the grouping fields before aggregating when true. When false, input must already be sorted by the grouping fields |
| `ignore_case` | Ignore case when comparing group keys |
| `narm` | Skip `NA` or `NaN` values in operations |
| `print_full_line` | Include all fields from an input row in addition to the requested aggregates |

The wrapper passes `grouping` to Datamash as `--group` only when the string is nonempty. `header_in`, `header_out`, and `need_sort` are independent switches. Choose each from the input and output contract instead of copying the values from an exemplar. In particular, sorting is part of result correctness: Datamash requires input sorted by the same grouping fields when `need_sort` is false.

## Grouped shapes in IWC

The [SARS-CoV-2 variation reporting workflow](https://github.com/galaxyproject/iwc/blob/deafc4876f2c778aaf075e48bd8e95f3604ccc92/workflows/sars-cov-2-variant-calling/sars-cov-2-variation-reporting/variation-reporting.ga) groups on ten columns and collapses seven value columns:

```yaml
tool_id: toolshed.g2.bx.psu.edu/repos/iuc/datamash_ops/datamash_ops/1.8+galaxy0
tool_state:
  grouping: "1,2,3,4,5,6,7,8,9,10"
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

This is an observed `need_sort: false` setting. Reuse it only if the upstream table is sorted by all ten grouping columns. The same workflow also groups by column 3, sorting first and computing five statistics in one step:

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

The same workflow also has single-operation `countunique` steps. A repeat list of one operation is valid. These snippets show tool state, while a complete workflow step also needs its upstream input connection and a consumer or declared output.

## Whole-file reduction

The [VGP purge-duplicates workflow](https://github.com/galaxyproject/iwc/blob/deafc4876f2c778aaf075e48bd8e95f3604ccc92/workflows/VGP-assembly-v2/Purge-duplicates-one-haplotype-VGP6b/Purging-duplicates-one-haplotype-VGP6b.ga) leaves `grouping` empty and calculates `absmax` on column 3. It has no input or output header, and sorting is unnecessary because there is no grouping key:

```yaml
tool_id: toolshed.g2.bx.psu.edu/repos/iuc/datamash_ops/datamash_ops/1.9+galaxy0
tool_state:
  grouping: ""
  header_in: false
  header_out: false
  in_file: { __class__: ConnectedValue }
  need_sort: false
  operations:
    - op_name: absmax
      op_column: "3"
```

The [GNU Datamash 1.9 manual](https://www.gnu.org/software/datamash/manual/datamash.html) defines `absmax` as the greatest absolute value, here calculated from column 3. It does not return the source row. If the sign or other fields matter, this single reduction is insufficient.

## Check the resulting table

- **Grouping and sorting:** `grouping` is a string, not a YAML list. With `need_sort: false`, check that the input is sorted by all selected grouping fields. If that is not guaranteed, enable sorting. For stable fixtures, check representative keys and aggregate values as well as output shape.
- **Headers:** `header_in: true` consumes an input header and `header_out: true` emits names such as `GroupBy(...)` and `collapse(...)`. Downstream tools may require the generated labels to be renamed. The variation reporting workflow uses `tp_find_and_replace` for that cleanup.
- **Collapsed values:** `collapse` joins each group's values with commas. Variation reporting follows it with a regular expression that keeps the first comma-delimited member from each of seven collapsed columns. That is first-member extraction, not an `argmax` operation. Its meaning depends on input order, and the expression must cover the intended columns and comma-containing values.
- **Missing values and extra fields:** Set `narm` from the intended missing-value policy. `print_full_line: true` adds fields from an input row, so downstream column positions differ from the two shown grouped examples. Variation reporting has another step with this switch enabled.
- **Version pins:** The examples use pins present in the pinned IWC snapshot. Select an installed version whose wrapper contract has been checked for the workflow, rather than changing a working pin solely to match an example.

## Grouping1 when its behavior fits

`Grouping1` is another Galaxy grouping tool. The pinned IWC snapshot has 15 occurrences across seven workflow files. The [PathoGFAIR workflow](https://github.com/galaxyproject/iwc/blob/deafc4876f2c778aaf075e48bd8e95f3604ccc92/workflows/microbiome/pathogen-identification/pathogen-detection-pathogfair-samples-aggregation-and-visualisation/Pathogen-Detection-PathoGFAIR-Samples-Aggregation-and-Visualisation.ga) groups by column 6 with `optype: length` to count, and elsewhere uses `optype: cat` to concatenate column 2 by column 1.

Its fields are `groupcol`, `ignorecase`, `ignorelines`, and `operations` entries with `optype`, `opcol`, `opround`, and `opdefault`. The [Galaxy wrapper](https://github.com/galaxyproject/galaxy/blob/a63da1dfd1960360f4aa2fddc6a75396954d750a/tools/stats/grouping.xml) also exposes line-prefix exclusions and numeric replacement/rounding settings. These can make it a better fit for an existing workflow. Do not substitute `Grouping1` operation names directly into Datamash state. For example, its `length` is a count and its `cat` is concatenation, while Datamash uses `op_name` and different value names.

## See also

- [[iwc-tabular-operations-survey]] — corpus inventory, related operations, and pinned sources.
- [[tabular-sql-query]] — SQL aggregation and joins.
- [[tabular-join-on-key]] — key joins before or after aggregation.
- [[tabular-compute-new-column]] — per-row computation before aggregation.
