---
type: pattern
pattern_kind: operation
evidence: corpus-and-verified
title: "Tabular: compute a new column"
tags:
  - target/galaxy
status: draft
created: 2026-04-30
revised: 2026-09-28
revision: 5
summary: "Append, insert, or replace computed columns with column_maker (Add_a_column1), using a shared input-typing policy and explicit failure handling."
related_notes:
  - "[[iwc-tabular-operations-survey]]"
  - "[[iwc-parameter-derivation-survey]]"
  - "[[nextflow-to-galaxy-channel-shape-mapping]]"
related_patterns:
  - "[[tabular-cut-and-reorder-columns]]"
  - "[[tabular-sql-query]]"
  - "[[derive-parameter-from-file]]"
related_molds:
  - "[[implement-galaxy-tool-step]]"
verification_paths:
  - verification/workflows/tabular-compute-new-column/compute-new-column.gxwf-test.yml
iwc_exemplars:
  - workflow: sars-cov-2-variant-calling/sars-cov-2-variation-reporting/variation-reporting
    steps:
      - label: "Raw cN arithmetic with auto_col_types true"
      - label: "String concatenation with auto_col_types false"
    why: "Shows the key auto_col_types split between arithmetic and string concatenation expressions."
    confidence: high
  - workflow: sars-cov-2-variant-calling/sars-cov-2-consensus-from-variation/consensus-from-variation
    why: "Shows explicit-cast arithmetic with auto_col_types false and skip-non-computable handling."
    confidence: high
  - workflow: amplicon/amplicon-mgnify/mgnify-amplicon-pipeline-v5-rrna-prediction/mgnify-amplicon-pipeline-v5-rrna-prediction
    why: "Computes c1 != 0 before reading the result as a boolean parameter for a non-empty gate."
    confidence: high
---

# Tabular: compute a new column

`column_maker/Add_a_column1` evaluates expressions over a tabular dataset's `c1`, `c2`, … fields and appends, inserts, or replaces columns. Expressions run in order within one tool step, so later expressions see the columns produced by earlier ones. Choose one input-typing policy for the whole step and keep failure handling explicit.

## Tool and scope

The examples use `toolshed.g2.bx.psu.edu/repos/devteam/column_maker/Add_a_column1/2.1`, displayed as “Compute on rows”. The pinned IWC snapshot in [[iwc-tabular-operations-survey]] contains 55 occurrences across 18 workflows: 49 at version 2.1, two at 2.0, and four at 1.6. The structured error-handling counts below cover the 51 version 2.0/2.1 states, not the four older states.

The tool accepts a `tabular` dataset through `input` and produces `out_file1`, with the input's datatype as its output format. Retained original fields keep their text formatting. Computed values are serialized as strings, with optional decimal formatting for floats. Blank lines and lines starting with `#` are skipped among data rows.

Use it for arithmetic, explicit type conversions, and string expressions supported by the wrapper's expression whitelist. It does not execute arbitrary Python programs. Awk can fit more involved row transformations, as illustrated by the operation pages under [[galaxy-tabular-patterns]]. Use [[tabular-sql-query]] when projection, computation, and row filtering belong in one query.

For a computed value that must become a runtime scalar or boolean, continue with [[derive-parameter-from-file]] or [[conditional-gate-on-nonempty-result]]. MGnify's rRNA prediction workflow computes `c1 != 0` before reading the result as a boolean parameter.

## Parameters and defaults

`tool_state.ops` is a conditional selected by `header_lines_select`. Its `expressions` repeat must remain inside `ops`. The `error_handling` section and `avoid_scientific_notation` boolean are top-level siblings of `ops`.

| Field | Accepted values and effect |
|---|---|
| `ops.header_lines_select` | `"no"` (default) or `"yes"`. With yes, the first physical line supplies the header and its fields are updated by the column operations. With no, it is handled as a data row, or skipped if blank or starting with `#`. |
| `ops.expressions` | One or more entries containing `cond` and `add_column`, plus `new_column_name` in the headered branch. Entries execute in order. |
| `expressions[].cond` | Expression over the current `cN` fields, using the supported functions and operators. |
| `expressions[].new_column_name` | Available in the `"yes"` branch, with default `New Column`. Names an appended/inserted field or replaces a field's header. Set it explicitly for meaningful headers and omit it in the `"no"` branch. |
| `expressions[].add_column.mode` | `""` to append, `I` to insert before the selected field, or `R` to replace it. |
| `expressions[].add_column.pos` | A one-based integer with minimum 1 for insert/replace. Append uses the hidden empty value `""`. |
| `error_handling.auto_col_types` | Boolean, default true. Use Galaxy's input column-type metadata when true, or treat all original fields as strings when false. |
| `error_handling.fail_on_non_existent_columns` | Boolean, default true. Fail on an expression referencing a missing `cN`. Disabling this routes that failure through the selected non-computable-row policy. |
| `error_handling.non_computable.action` | Row-expression failure policy, described below. Default `--fail-on-non-computable`. |
| `avoid_scientific_notation` | Boolean, default false. With true, computed floats use expanded decimal output. Otherwise a float may render as `1e-13`. |

The five non-computable policies are:

| Action | Result when a row expression fails |
|---|---|
| `--fail-on-non-computable` | Fail the tool run. |
| `--skip-non-computable` | Omit the row. |
| `--keep-non-computable` | Write the original row unchanged, without any changes from earlier expressions. |
| `--non-computable-blank` | Substitute an empty field value for the failed expression and continue. |
| `--non-computable-default` | Substitute `non_computable.default_value` and continue. Suggestions include `nan`, `NA`, and `.`, or a custom string. |

Keep missing-column failure enabled and select failure on non-computable values unless a different result is part of the intended operation. These strict settings are already the wrapper defaults. All 51 structured corpus states enable missing-column failure. Forty-nine fail on non-computable rows, and two skip them in consensus-from-variation's coordinate arithmetic. Skipping is valid when dropping those rows is intended, but check what was dropped. Syntax errors and input type-conversion failures are not repaired by a row-skipping policy.

## Choose one input-typing policy per step

`auto_col_types` does not infer types from an expression. With true, the wrapper passes Galaxy's recorded input column types to the script. The script converts the original row fields once, before evaluating the expressions. With false, original fields enter as strings. Values produced by earlier expressions retain their result types for subsequent expressions in that step.

| Expression kind | Typing choice |
|---|---|
| Arithmetic on bare numeric `cN`, such as `(c18 + c19) / c6` | True, with appropriate input column-type metadata. |
| String concatenation, such as `c5 + '>' + c6` | False, to keep original fields as strings. |
| Arithmetic with explicit casts, such as `int(c2) - 1` | False, with the expression supplying conversion. |
| Calculations requiring different input-typing policies | Separate tool steps, or one consistent string policy with explicit numeric casts. |

Multiple `expressions` entries cannot have separate `auto_col_types` settings. An expression may use `str()`, `int()`, or `float()` explicitly when its desired type differs from the step's input policy.

A wrong policy can produce a valid but wrong result. With string inputs, `c1 + c2` concatenates `"3"` and `"4"` into `"34"`, while integer inputs produce `7`. True does not guarantee numeric inputs if Galaxy recorded string types. Conversely, a non-numeric value in a column recorded as numeric causes a conversion failure, not silent replacement with zero. Check metadata and assert meaningful output values, not just successful execution.

The three false settings among the 51 structured states illustrate two uses:

- Variation reporting appends `change` and `change_with_pos` with two string expressions in one step.
- Two consensus-from-variation steps use explicit `int()` arithmetic with skip-on-non-computable handling.

The other 48 use true, including variation reporting's raw-column arithmetic.

## Idiomatic step fragments

These are partial gxformat2 tool-step fragments. Supply the workflow's connection to the required `input` dataset and connect or publish `out_file1` as appropriate. They preserve the version 2.1 pin used by variation reporting.

### Insert, then replace with arithmetic

The first expression inserts `AFcaller` before column 8. The second expression sees that expanded row, then replaces column 7 with the calculated `AF`.

```yaml
tool_id: toolshed.g2.bx.psu.edu/repos/devteam/column_maker/Add_a_column1/2.1
tool_state:
  error_handling:
    auto_col_types: true
    fail_on_non_existent_columns: true
    non_computable:
      action: --fail-on-non-computable
  ops:
    header_lines_select: "yes"
    expressions:
      - cond: c7
        add_column:
          mode: I        # insert
          pos: "8"
        new_column_name: AFcaller
      - cond: round((c18 + c19) / c6, 6)
        add_column:
          mode: R        # replace
          pos: "7"
        new_column_name: AF
```

This is the arithmetic step in `sars-cov-2-variant-calling/sars-cov-2-variation-reporting/variation-reporting`. Column references in the second expression are positions after the insertion, not positions in the original input.

### Append string-derived columns

The same workflow appends `change` and `change_with_pos` in one step with two expressions sharing the string policy.

```yaml
tool_id: toolshed.g2.bx.psu.edu/repos/devteam/column_maker/Add_a_column1/2.1
tool_state:
  error_handling:
    auto_col_types: false
    fail_on_non_existent_columns: true
    non_computable:
      action: --fail-on-non-computable
  ops:
    header_lines_select: "yes"
    expressions:
      - cond: c5 + '>' + c6
        add_column:
          mode: ""
          pos: ""
        new_column_name: change
      - cond: c3 + ':' + c19
        add_column:
          mode: ""
          pos: ""
        new_column_name: change_with_pos
```

Appending the first result leaves the original column positions intact, so the second expression still reads original `c3` and `c19`.

## Pitfalls and recovery

- **Wrong typing or stale metadata.** A successful `+` expression can concatenate instead of adding. Inspect Galaxy's recorded column types. Correct metadata or choose false with explicit casts when strings and missing-value handling require it.
- **Conversion errors before evaluation.** A numeric metadata type applied to a non-numeric field can fail even if the expression never uses that field. The script converts all original fields. Fix the data or use the string policy and explicit conversions. Row-skipping does not catch this initial conversion failure.
- **Flattened expression state.** Keep `expressions` under `tool_state.ops`, alongside `header_lines_select`. Keep `error_handling` alongside `ops`. A flat repeat is not the wrapper's parameter structure.
- **Header mismatch.** Headered mode consumes the first physical line and changes its fields to match append/insert/replace. A leading comment or blank line is therefore not an interchangeable header. Headerless mode skips blank/comment lines and computes the first ordinary row. Select the branch matching the input, and include `new_column_name` only in the headered branch.
- **Changing column positions.** Inserts shift later `cN` references. Replacements change values at existing positions. Write each expression against the row at that point. Replacement positions must exist in the planned column layout.
- **Permissive error handling hiding lost results.** Inspect skipped-row diagnostics and test expected output values or retained rows. Keep-unchanged can leave rows with fewer columns than successfully computed rows. Blank/default substitution preserves the operation's column change but introduces missing or fallback values that downstream tools must accept.
- **Similar tool names.** `add_value/addValue` adds a constant column. `column_maker/Add_a_column1` computes expressions. Match the tool ID to the required operation.

## Constant-column alternative

`toolshed.g2.bx.psu.edu/repos/devteam/add_value/addValue/1.0.1` is a separate constant-column tool, with 31 occurrences in the pinned survey. It remains a valid choice for that operation. Use `column_maker` when the value depends on existing columns or its insert/replace and error-handling controls fit the task. A shared display name does not make their parameter contracts interchangeable.

## Evidence and verification

The existing behavior fixture is recorded in `verification_paths` above. It compares numeric and concatenated outputs for `c1 + c2` under different typing settings. The version 2.1 script was also exercised directly with supplied numeric and string types, reproducing both committed expected outputs and checking expression order, header replacement, and strict failures. The record at `verification/workflows/tabular-compute-new-column/README.md` describes these checks. This revision does not rerun Galaxy. Header handling alone does not determine input column types, so the fixture's result must be interpreted with the actual Galaxy metadata passed to each step.

The source review covers the version 2.1 [wrapper](https://github.com/galaxyproject/tools-iuc/blob/802d7fe606623d900fd0d5de157e87166c0b7e84/tools/column_maker/column_maker.xml) and [script](https://github.com/galaxyproject/tools-iuc/blob/802d7fe606623d900fd0d5de157e87166c0b7e84/tools/column_maker/column_maker.py). The current 2.1+galaxy0 [wrapper](https://github.com/galaxyproject/tools-iuc/blob/b9b16be49cbe9777b5d1cec3d22a279cfe3e74a7/tools/column_maker/column_maker.xml) retains the typing, expression-order, header, and failure contracts described here. Older 1.6 states are outside this parameter recipe.

## See also

- [[iwc-tabular-operations-survey]] — pinned counts and corrected typing constraints in §7.
- [[iwc-parameter-derivation-survey]] — computation followed by parameter extraction.
- [[tabular-cut-and-reorder-columns]] — column projection without computation.
- [[tabular-sql-query]] — combined projection, computation, and filtering.
- [[derive-parameter-from-file]] — one-value dataset to typed runtime parameter.
