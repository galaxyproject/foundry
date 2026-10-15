---
type: pattern
pattern_kind: operation
evidence: corpus-and-verified
title: "Tabular: group and aggregate"
tags:
  - target/galaxy
status: draft
created: 2026-05-02
revised: 2026-09-29
revision: 3
summary: "Group tabular rows by one-based key columns, sort when needed, and choose Datamash operations and header settings from the intended result."
related_notes:
  - "[[iwc-tabular-operations-survey]]"
  - "[[nextflow-to-galaxy-channel-shape-mapping]]"
related_patterns:
  - "[[tabular-compute-new-column]]"
  - "[[tabular-sql-query]]"
  - "[[tabular-join-on-key]]"
related_molds:
  - "[[implement-galaxy-tool-step]]"
verification_paths:
  - verification/workflows/tabular-group-and-aggregate-with-datamash/group-and-aggregate.gxwf-test.yml
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

Connect a tabular dataset to `datamash_ops` when the result should have one row per key and one or more aggregate values for that key. Set `grouping` to the one-based key columns, add an `operations` entry for each requested value, and decide whether the input needs sorting. An empty `grouping` reduces the whole file to one row. If every input row should remain, use [[tabular-compute-new-column]] instead.

## Build a grouped summary

Suppose a table has `sample`, `value`, and `tag` columns. To produce one row per sample with the number of distinct values, minimum, maximum, and a comma-separated tag list, connect the table to the Datamash `in_file` port and set:

```yaml
tool_id: toolshed.g2.bx.psu.edu/repos/iuc/datamash_ops/datamash_ops/1.9+galaxy0
tool_state:
  in_file: { __class__: ConnectedValue }
  grouping: "1"
  header_in: true
  header_out: true
  need_sort: true
  operations:
    - op_name: countunique
      op_column: "2"
    - op_name: min
      op_column: "2"
    - op_name: max
      op_column: "2"
    - op_name: collapse
      op_column: "3"
```

`grouping` is a comma-separated string, so multiple keys use `"1,2,3"`, not a YAML list. The example sets `need_sort: true` because its input alternates samples A and B. Datamash then sorts on the selected key before grouping. Set `need_sort: false` only when the upstream table is already sorted by **all** selected key columns. `header_in: true` excludes the first row from the calculation, while `header_out: true` adds names such as `GroupBy(sample)` and `min(value)` to the result.

The checked-in example under `verification/workflows/tabular-group-and-aggregate-with-datamash/` connects one headered input to two Datamash steps. Its grouped output is:

```text
GroupBy(sample)  countunique(value)  min(value)  max(value)  collapse(tag)
A                2                   -3          4           red,red
B                2                   -7          2           blue,blue
```

The committed output is tab-separated, and the Galaxy test compares its full content. Use the example workflow's tool repository pin, input connection, and output declaration when turning the excerpt above into a full gxformat2 step.

## Reduce the whole file

Leave `grouping` empty when the operation should see every data row as one group. The example's second step calculates the largest absolute value in column 2:

```yaml
grouping: ""
header_in: true
header_out: false
need_sort: false
operations:
  - op_name: absmax
    op_column: "2"
```

Its expected output is `-7` with no header. In this Galaxy run, `absmax` selects the value with the greatest absolute magnitude while retaining its sign. It does not return the source row. Sorting by a key is unnecessary here because there is no grouping key. The [VGP purge-duplicates workflow](https://github.com/galaxyproject/iwc/blob/deafc4876f2c778aaf075e48bd8e95f3604ccc92/workflows/VGP-assembly-v2/Purge-duplicates-one-haplotype-VGP6b/Purging-duplicates-one-haplotype-VGP6b.ga) uses the same whole-file operation on column 3.

## Choose the remaining settings

The [Datamash wrapper](https://github.com/galaxyproject/tools-iuc/blob/b9b16be49cbe9777b5d1cec3d22a279cfe3e74a7/tools/datamash/datamash-ops.xml) accepts at least one `{ op_name, op_column }` operation. Its [input/output macro](https://github.com/galaxyproject/tools-iuc/blob/b9b16be49cbe9777b5d1cec3d22a279cfe3e74a7/tools/datamash/macros.xml) accepts `tabular`, `tsv`, or `csv` input and keeps that datatype for the output. Select these other options from the table's actual contract:

| Setting | When it matters |
|---|---|
| `header_in` | Enable when the first input row is a header, so it is not aggregated |
| `header_out` | Enable when consumers need Datamash-generated group and operation labels |
| `narm` | Enable only when skipping `NA` and `NaN` values matches the intended calculation |
| `ignore_case` | Enable when keys differing only in case should share a group |
| `print_full_line` | Adds all fields from an input row to the grouped output, changing downstream column positions |

## Check the result and downstream use

- Check representative keys and aggregate values, as well as row count. With `need_sort: false`, inspect the actual input ordering across all grouping fields. [GNU Datamash requires sorted input for grouping](https://www.gnu.org/software/datamash/manual/datamash.html).
- Check header content. Wrong `header_in` drops a data row or treats a header as data. Generated `GroupBy(...)` and operation labels may need renaming before a later step uses them.
- Check what `collapse` means for the data. It joins all values in each group with commas. The [SARS-CoV-2 variation reporting workflow](https://github.com/galaxyproject/iwc/blob/deafc4876f2c778aaf075e48bd8e95f3604ccc92/workflows/sars-cov-2-variant-calling/sars-cov-2-variation-reporting/variation-reporting.ga) groups on ten columns, collapses seven more, and then uses a regex to keep each collapsed column's first member. That selects by input order, not by a maximum value. A replacement expression must match the number of collapsed columns and account for commas in values.
- Check version pins against the installed wrapper. The example uses `1.9+galaxy0`. The variation reporting workflow uses `1.8+galaxy0`. Changing a working pin requires checking its parameter and output contracts, not just its version number.

## When Grouping1 fits

`Grouping1` is another Galaxy grouping tool. The [PathoGFAIR workflow](https://github.com/galaxyproject/iwc/blob/deafc4876f2c778aaf075e48bd8e95f3604ccc92/workflows/microbiome/pathogen-identification/pathogen-detection-pathogfair-samples-aggregation-and-visualisation/Pathogen-Detection-PathoGFAIR-Samples-Aggregation-and-Visualisation.ga) uses its `length` operation for a count and its `cat` operation for concatenation. Its [wrapper](https://github.com/galaxyproject/galaxy/blob/a63da1dfd1960360f4aa2fddc6a75396954d750a/tools/stats/grouping.xml) also exposes line-prefix exclusions and numeric replacement/rounding settings. Keep or choose it when those behaviors fit the workflow. Its `groupcol`, `ignorecase`, `ignorelines`, and `operations[].optype` fields are a different contract from Datamash's `grouping`, `ignore_case`, and `operations[].op_name`.

For SQL grouping combined with joins or expressions, see [[tabular-sql-query]]. For a key join without aggregation, see [[tabular-join-on-key]]. The wider tool inventory remains in [[iwc-tabular-operations-survey]].
