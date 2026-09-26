---
type: research
title: "Galaxy Apply Rules DSL"
tags:
  - target/galaxy
status: draft
created: 2026-04-30
revised: 2026-09-26
revision: 3
related_notes:
  - "[[galaxy-collection-tools]]"
  - "[[galaxy-collection-semantics]]"
  - "[[nextflow-to-galaxy-channel-shape-mapping]]"
  - "[[nextflow-operators-to-galaxy-collection-recipes]]"
  - "[[collection-build-list-paired-with-apply-rules]]"
  - "[[collection-build-named-bundle]]"
  - "[[collection-cleanup-after-mapover-failure]]"
  - "[[collection-flatten-after-fanout]]"
  - "[[collection-split-identifier-via-rules]]"
  - "[[collection-swap-nesting-with-apply-rules]]"
  - "[[collection-unbox-singleton]]"
  - "[[relabel-via-rules-and-find-replace]]"
  - "[[iwc-transformations-survey]]"
sources:
  - "https://github.com/galaxyproject/galaxy/blob/a63da1dfd1960360f4aa2fddc6a75396954d750a/lib/galaxy/util/rules_dsl.py"
  - "https://github.com/galaxyproject/galaxy/blob/a63da1dfd1960360f4aa2fddc6a75396954d750a/lib/galaxy/util/rules_dsl_spec.yml"
  - "https://github.com/galaxyproject/galaxy/blob/a63da1dfd1960360f4aa2fddc6a75396954d750a/lib/galaxy/managers/collections.py"
  - "https://github.com/galaxyproject/galaxy/blob/a63da1dfd1960360f4aa2fddc6a75396954d750a/lib/galaxy/tools/apply_rules.xml"
summary: "How Apply Rules derives columns from collection metadata, filters rows, and maps them into new collection structure."
---

# Galaxy Apply Rules DSL

Galaxy's `__APPLY_RULES__` reorganizes a collection by deriving columns from element identifiers and tags, transforming those columns, and mapping them into a new collection. It can relabel, filter, sort, flatten, or change nesting without processing file contents. The output is named `output`.

Use a dedicated collection tool when it expresses the operation directly, such as flattening or extracting an element. Apply Rules fits transformations that depend on parsed identifiers, tag values, or several operations together. [[galaxy-collection-tools]] lists the alternatives.

## A rule set inside a workflow

The tool parameter named `rules` holds an object with two lists: `rules` performs the transformations and `mapping` defines the output. Mapping entries contain a `type` and a `columns` array. A sibling `tool_state.mapping` or a bare `tool_state.rules` array is not this serialized shape.

This step swaps the axes of a `list:list` input:

```yaml
tool_id: __APPLY_RULES__
in:
  input: sample_by_segment
tool_state:
  input: { __class__: ConnectedValue }
  rules:
    rules:
      - type: add_column_metadata
        value: identifier0
      - type: add_column_metadata
        value: identifier1
    mapping:
      - type: list_identifiers
        columns: [1, 0]
```

The first rule creates column 0 from the outer identifier. The second creates column 1 from the inner identifier. Mapping `[1, 0]` groups by segment, then sample. The executable workflow and test live under `verification/workflows/collection-swap-nesting-with-apply-rules/`. See [[collection-swap-nesting-with-apply-rules]] for the expected collection.

## Rows, columns, and sources

For collection input, Galaxy starts with one **empty row per leaf dataset**. Source metadata accompanies each row: its identifier path, index path, dataset reference, dataset tags, and any inherited sample-sheet columns. `identifier0` means the outermost identifier. `index0` is its zero-based position.

Column indices are zero-based and refer to the table at that point in execution. Addition rules append columns. Removing columns shifts subsequent indices. Filters and sorting carry source metadata along with the rows, so a renamed row still points to its original dataset.

Mapping uses the final table. Unmapped columns can remain, so removing intermediate columns is optional. Plan the output identifier path before writing rules, then track the columns that supply it.

## Rule operations

Each rule requires `type` and the parameters listed below, except fields explicitly marked optional. Rules run in order. Names and behavior here follow Galaxy's [implementation](https://github.com/galaxyproject/galaxy/blob/a63da1dfd1960360f4aa2fddc6a75396954d750a/lib/galaxy/util/rules_dsl.py) and [rule specification](https://github.com/galaxyproject/galaxy/blob/a63da1dfd1960360f4aa2fddc6a75396954d750a/lib/galaxy/util/rules_dsl_spec.yml).

### Add columns

| Rule | Parameters and result |
|---|---|
| `add_column_metadata` | String `value`: `identifierN`, `indexN`, or `tags`. Appends the identifier, stringified index, or sorted comma-joined dataset tags. The requested nesting level must exist. |
| `add_column_group_tag_value` | String `value` names the key in `group:key:value`. Appends its value. Optional `default_value` defaults to `""`. If multiple tags match, the first after sorting wins. |
| `add_column_from_sample_sheet_index` | Integer `value` selects a source sample-sheet column. Requires that source metadata to exist. |
| `add_column_value` | String `value` appends a constant. |
| `add_column_rownum` | Integer `start` appends successive row numbers as strings, beginning at that value. |
| `add_column_basename` | Integer `target_column` appends everything after the last `/`. |
| `add_column_concatenate` | Integer `target_column_0` and `target_column_1` append their concatenation, without a separator. |
| `add_column_substr` | Integer `target_column`, integer `length`, and `substr_type`: `keep_prefix`, `keep_suffix`, `drop_prefix`, or `drop_suffix`. Appends the resulting substring. |
| `add_column_regex` | Integer `target_column` and string `expression`. Optional `replacement`, `group_count`, and boolean `allow_unmatched`. Behavior below. |

Regex extraction uses Python regular expressions and searches within the cell. Without `replacement` or `group_count`, it appends the **whole match**, not the first capture group. With `group_count`, it appends one column per capture group and requires exactly that many groups. With `replacement`, it appends the expanded template for the match, such as `'\1'`, not a rewritten copy of the whole cell.

Unmatched rows fail by default. `allow_unmatched: true` appends empty strings instead. Anchor expressions when the entire identifier must conform, and use YAML single quotes to preserve regex backslashes. [[collection-split-identifier-via-rules]] shows a nesting example.

### Filter rows

`invert` is a required boolean for the first four filters. Its meaning depends on the operation:

| Rule | Required parameters | `invert: false` | `invert: true` |
|---|---|---|---|
| `add_filter_regex` | Integer `target_column`, string `expression`, boolean `invert` | Keep regex matches | Keep nonmatches |
| `add_filter_matches` | Integer `target_column`, string `value`, boolean `invert` | Keep exact matches | Keep nonmatches |
| `add_filter_empty` | Integer `target_column`, boolean `invert` | Keep nonempty cells | Keep empty cells |
| `add_filter_count` | Integer `count`, `which: first` or `last`, boolean `invert` | Drop the selected first/last rows | Keep only those rows |

Exact matching is case-sensitive and includes whitespace. Regex filters also search within cells.

`add_filter_compare` requires integer `target_column`, integer `value`, and `compare_type`: `less_than`, `less_than_equal`, `greater_than`, or `greater_than_equal`. It parses cells as floating-point numbers and keeps rows satisfying the comparison. It has no inversion parameter.

### Reorder or reshape the table

| Rule | Parameters and result |
|---|---|
| `sort` | Integer `target_column` and boolean `numeric`. Sorts ascending, numerically if true, otherwise by case-sensitive string order. |
| `remove_columns` | `target_columns`, an array of column indices. Removes those columns. |
| `swap_columns` | Integer `target_column_0` and `target_column_1`. Exchanges their positions. |
| `split_columns` | Arrays `target_columns_0` and `target_columns_1`. Produces two rows per input row, each retaining one selected group and all unselected columns. Both rows retain the same dataset source. |

For example, splitting groups `[0]` and `[1]` transforms `["left", "right", "sample"]` into `["left", "sample"]` and `["right", "sample"]`. It does not generate a Cartesian product.

## Map columns into a collection

| Mapping type | `columns` and effect |
|---|---|
| `list_identifiers` | One or more columns in outer-to-inner order. `[0]` produces `list`, `[0, 1]` produces `list:list`. |
| `paired_identifier` | One column containing read direction. Adds an innermost `paired` level. |
| `paired_or_unpaired_identifier` | One column containing read direction or `unpaired`. Adds an innermost `paired_or_unpaired` level. |
| `tags` | Columns whose values become dataset tags. Each cell supplies one tag. |
| `group_tags` | Columns whose values become dataset tags prefixed with `group:`. To produce `group:condition:treated`, supply `condition:treated`. |

A second list column creates another list level even if its values are `forward` and `reverse`. To create `list:paired`, use both `list_identifiers` and `paired_identifier`. Pair roles are case-insensitive: `f`, `1`, `r1`, and `forward` normalize to `forward`, while `r`, `2`, `r2`, and `reverse` normalize to `reverse`. For mixed paired and single reads, supply `u` or `unpaired` explicitly for single reads.

For flat identifiers `sampleA_R1.fastq.gz` and `sampleA_R2.fastq.gz`, this parameter derives the sample and pair roles directly:

```yaml
rules:
  rules:
    - type: add_column_metadata
      value: identifier0
    - type: add_column_regex
      target_column: 0
      expression: '^(.+)_R([12])\.fastq\.gz$'
      group_count: 2
  mapping:
    - type: list_identifiers
      columns: [1]
    - type: paired_identifier
      columns: [2]
```

Column 1 is `sampleA`, column 2 is `1` or `2`, and the output type is `list:paired`. Each sample must have the intended forward and reverse datasets. [[collection-build-list-paired-with-apply-rules]] describes paired promotion from existing nesting.

## Check the result

Test identifiers, collection type, and dataset membership together. A correct element count can hide swapped samples or incorrect pairing. Check representative contents as well as structure.

Watch for these failures:

- **Duplicate output paths:** two rows mapping to the same full identifier path cause the later dataset to replace the earlier one in the builder. Make the final path unique for every intended dataset.
- **Unexpected filtering:** inspect retained identifiers, especially around `invert` and count filters. Filtering is selection, not validation that every input conforms.
- **Missing metadata or bad indices:** check the input nesting and recalculate column numbers after removal or splitting.
- **Failed extraction or numeric conversion:** fix the identifier contract or select the intended rows before extraction. Use `allow_unmatched` only when an empty result has a defined role.

The [collection builder](https://github.com/galaxyproject/galaxy/blob/a63da1dfd1960360f4aa2fddc6a75396954d750a/lib/galaxy/managers/collections.py#L823-L960) defines grouping and tag assignment. [[galaxy-collection-semantics]] covers downstream mapping and reduction. For a relabeling task, see [[relabel-via-rules-and-find-replace]].
