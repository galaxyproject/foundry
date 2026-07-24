---
type: pattern
pattern_kind: operation
evidence: corpus-observed
title: "Tabular: compute a new column"
tags:
  - target/galaxy
status: draft
created: 2026-04-30
revised: 2026-05-03
revision: 3
ai_generated: true
summary: "Use column_maker (Add_a_column1) with strict error_handling to insert/replace a computed column. Per-expression-kind auto_col_types rule."
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

## Tool

`toolshed.g2.bx.psu.edu/repos/devteam/column_maker/Add_a_column1/2.1` ("Compute on rows", historically "Add a column"). 93 step occurrences in the surveyed IWC corpus — the canonical computed-column tool. Source: `$TOOLS_IUC/tools/column_maker/column_maker.xml` (the toolshed owner is `devteam` for historical reasons; modern source lives in `tools-iuc`).

## When to reach for it

Insert, replace, or append a column whose value is a Python expression over the existing `cN` columns. Multiple expressions can be sequenced inside a single tool step (each one operates on the running output of the previous). Use this for arithmetic, simple type coercion, and string concatenation.

If the row decision needs a multi-line conditional or `split`/`gsub`, prefer awk (see the awk recipe sub-pages cross-referenced from [[iwc-tabular-operations-survey]]). If columns and a row predicate are computed together, prefer [[tabular-sql-query]].

If the computed table value is only an intermediate scalar or boolean that will be read back with `param_value_from_file`, keep the `column_maker` mechanics here but follow [[derive-parameter-from-file]] or [[conditional-gate-on-nonempty-result]] downstream. MGnify uses this shape for `c1 != 0` before reading the result as a boolean.

## Parameters

`tool_state` has three top-level fields that matter for authoring: `error_handling` (a `<section>` in the wrapper), `ops` (a conditional keyed on `header_lines_select`, holding `expressions`), and the optional `avoid_scientific_notation` boolean. `expressions` is a `<repeat>` nested under `ops` — flattening it to the top level produces YAML that won't roundtrip.

- `error_handling` — **set as below**:

  ```yaml
  error_handling:
    auto_col_types: <see table>
    fail_on_non_existent_columns: true
    non_computable:
      action: --fail-on-non-computable   # see enum below
  ```

  `fail_on_non_existent_columns: true` is uniform across all 51 corpus instances. `non_computable.action` accepts five values per the wrapper: `--fail-on-non-computable` (default; 49/51 in corpus), `--skip-non-computable` (2/51, both in `consensus-from-variation.gxwf.yml` where BED-coordinate arithmetic can legitimately yield non-numerics), `--keep-non-computable`, `--non-computable-blank`, and `--non-computable-default` (which requires a `non_computable.default_value` sub-field, e.g. `nan`, `NA`, `.`).

- `ops.header_lines_select`: select with values `yes` / `no`. With `yes`, the first input line is passed through unchanged and each expression must include a `new_column_name` (used as the header label). With `no`, expressions must *omit* `new_column_name` and the first line is computed like any other.

- `ops.expressions`: repeat list of `{ cond, add_column: { mode, pos }, new_column_name? }` entries, evaluated left-to-right. Expressions can reference columns added by earlier expressions in the same step.

- `add_column.mode`: select with values `""` (Append), `I` (Insert), `R` (Replace).
- `add_column.pos`: 1-indexed integer (`min: 1` per wrapper) for `I` and `R`; the empty string `""` for Append (the wrapper renders `pos` as a hidden empty param when `mode: ""`).
- `avoid_scientific_notation`: optional top-level boolean (default `false`). Set `true` to force decimal output for floats; otherwise small floats render as `1e-13`.

## The strict `auto_col_types` rule

`auto_col_types` controls whether bare `cN` references are coerced to numeric when the expression demands it. Corpus distribution is 48 `true` / 3 `false`. Pick by what the expression does to its `cN` references:

| Expression kind | `auto_col_types` |
|---|---|
| Arithmetic on raw `cN` (`(c18 + c19) / c6`, `round(...)`) | `true` |
| Pure string concatenation (`c5 + '>' + c6`) | `false` |
| Arithmetic with explicit casts (`int(c2) - …`, `float(cN)`) — the expression handles its own type coercion | `false` |
| Mixed | split into two `expressions:` entries with different settings |

Rationale: with `true`, `c5 + c6` performs numeric addition (silently turning a string concat into `0+0` if columns are non-numeric); with `false` and *no* explicit cast, `c18 + c19` is string concat, which silently produces `"3.13.4"` instead of `6.4`. Both bugs are silent. Explicit `int()` / `float()` is the third escape hatch.

Canonical exemplars to memorize:

- Arithmetic on raw `cN`, `auto_col_types: true` — the SARS-CoV-2 variation reporting workflow computes `AF = round((c18 + c19) / c6, 6)` and inserts `AFcaller`.
- String concat, `auto_col_types: false` — the same workflow appends `change` and `change_with_pos` from string concatenation expressions.
- Explicit-cast arithmetic, `auto_col_types: false` — the SARS-CoV-2 consensus-from-variation workflow uses `int(...)` expressions with `--skip-non-computable`.

## Idiomatic shapes

Insert + replace in one step, arithmetic on raw `cN`:

```yaml
tool_id: toolshed.g2.bx.psu.edu/repos/devteam/column_maker/Add_a_column1/2.1
tool_state:
  error_handling:
    auto_col_types: true
    fail_on_non_existent_columns: true
    non_computable:
      action: --fail-on-non-computable
  ops:
    header_lines_select: yes
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

Anchored by the SARS-CoV-2 variation reporting IWC exemplar.

String-concat new columns (append), `auto_col_types: false`:

```yaml
tool_id: toolshed.g2.bx.psu.edu/repos/devteam/column_maker/Add_a_column1/2.1
tool_state:
  error_handling:
    auto_col_types: false
    fail_on_non_existent_columns: true
    non_computable:
      action: --fail-on-non-computable
  ops:
    header_lines_select: yes
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

Anchored by the SARS-CoV-2 variation reporting IWC exemplar.

## Pitfalls

- **Wrong `auto_col_types`.** See the table above — the failure mode is silent and downstream-only.
- **Flattening `expressions:` to `tool_state` top level.** The actual nesting is `tool_state.ops.expressions` with `tool_state.ops.header_lines_select` as a sibling. `error_handling` and `avoid_scientific_notation` are siblings of `ops`, not nested inside it. Flat shapes don't roundtrip.
- **`new_column_name` paired with `header_lines_select: no`.** The wrapper only exposes `new_column_name` inside the `header_lines_select: yes` branch. Authoring a step with `header_lines_select: no` AND `new_column_name` produces YAML the tool form won't accept.
- **Mixing arithmetic and string concat in one entry.** Split into two `expressions:` entries with different `auto_col_types` rather than reaching for `str(...)` inside the expression.
- **Skipping `error_handling`.** Wrapper defaults differ from corpus defaults; without explicit `fail_on_non_existent_columns: true`, non-existent column refs may pass through depending on `non_computable.action`.
- **`add_column.mode` / `pos`.** `I` (insert) and `R` (replace) take a 1-indexed integer `pos`; append uses `mode: ""` and `pos: ""`. Off-by-one in `pos` shifts every downstream `cN` reference in subsequent expressions in the same step.
- **`Add a column` (`addValue/1.0.1`)** — a different, legacy tool that adds a *constant* column only. Do not confuse with `column_maker/Add_a_column1`.

## Legacy alternative

`toolshed.g2.bx.psu.edu/repos/devteam/add_value/addValue/1.0.1` ("Add a column", 56 step occurrences) is the legacy constant-column-only tool — heavily used in older VGP workflows. For new work, prefer `column_maker/Add_a_column1` even for constant columns; it carries the same `error_handling` story and unifies one tool.

## See also

- [[iwc-tabular-operations-survey]] — corpus survey, §7 decision record for the `auto_col_types` rule.
- [[iwc-parameter-derivation-survey]] — compute-then-parameterize seam.
- [[tabular-cut-and-reorder-columns]] — pure column projection without computation.
- [[tabular-sql-query]] — when project + compute + filter need to fuse.
- [[derive-parameter-from-file]] — when a one-value dataset must become a typed runtime parameter.
