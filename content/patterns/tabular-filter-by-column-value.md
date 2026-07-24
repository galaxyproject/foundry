---
type: pattern
pattern_kind: operation
evidence: corpus-observed
title: "Tabular: filter rows by column value"
tags:
  - target/galaxy
status: draft
created: 2026-04-30
revised: 2026-05-03
revision: 2
ai_generated: true
summary: "Use Filter1 with a Python expression over cN columns to drop rows. Highest-frequency tabular row filter in IWC."
related_notes:
  - "[[iwc-tabular-operations-survey]]"
  - "[[nextflow-to-galaxy-channel-shape-mapping]]"
related_patterns:
  - "[[tabular-filter-by-regex]]"
  - "[[tabular-sql-query]]"
related_molds:
  - "[[implement-galaxy-tool-step]]"
iwc_exemplars:
  - workflow: sars-cov-2-variant-calling/sars-cov-2-variation-reporting/variation-reporting
    why: "Shows a literal Filter1 predicate over a string status column with one header line."
    confidence: high
  - workflow: sars-cov-2-variant-calling/sars-cov-2-consensus-from-variation/consensus-from-variation
    why: "Shows a connected predicate generated upstream with header_lines set independently."
    confidence: high
  - workflow: epigenetics/consensus-peaks/consensus-peaks-atac-cutandrun
    why: "Shows another connected predicate shape where the filter rule is supplied at runtime."
    confidence: high
---

# Tabular: filter rows by column value

## Tool

`Filter1` (Galaxy core; bundled, no toolshed owner). Display name "Filter data on any column using simple expressions". Source: `$GALAXY/tools/stats/filtering_1_1_0.xml`.

## When to reach for it

One-shot row filter on tabular input. The row predicate is a single Python expression over `c1, c2, …` column references; the output preserves column order and types. By far the most common row-filter idiom in IWC (33 step occurrences in the surveyed corpus, second only to regex grep variants).

If the predicate needs join/sort/grouping semantics, switch to [[tabular-sql-query]] or to `datamash_ops`. If the predicate is a substring/regex over a single column or whole line, prefer [[tabular-filter-by-regex]].

## Parameters

- `cond`: text param, evaluated per row as a Python expression over `c1, c2, …` (1-indexed) column references. Comparison, boolean, and arithmetic operators all work; function calls (`len`, `range`, etc.) and `.split(...)` are supported per the wrapper help. Quote string literals. **Boolean operators must be lowercase** — `OR`/`AND` are name lookups, not boolean ops.
- `header_lines`: integer (the workflow YAML conventionally quotes it: `"0"`, `"1"`). **Set to `"1"` whenever the input has a header row.** Filter1 evaluates `cond` per row; rows whose evaluation raises an exception are skipped from output and counted in the dataset's "Condition/data issue" metadata (visible in the history-item info panel — not silent in the dataset metadata sense, but invisible in the data flow).
- The connected `input` port is the tabular dataset.

## Idiomatic shapes

Single-column equality, header-aware:

```yaml
tool_id: Filter1
tool_state:
  cond: c4=='PASS' or c4=='.'
  header_lines: '1'
```

Anchored by the SARS-CoV-2 variation reporting IWC exemplar.

Predicate produced upstream and wired in via `ConnectedValue` (lets a workflow author parameterize the predicate without a runtime parameter). Note that this corpus example has `header_lines: "0"` because the upstream rule already accounts for the header — the `header_lines` setting is independent of the `cond` source:

```yaml
tool_id: Filter1
tool_state:
  cond: { __class__: ConnectedValue }   # from a prior "generate filter rule" step
  header_lines: '0'
```

Anchored by the consensus peaks ATAC/CUT&RUN IWC exemplar.

## Pitfalls

- **Forgetting `header_lines`.** Default `"0"`. With a header row present, the header is evaluated like any other row; under a numeric comparison the header typically raises and is skipped, while a string-comparison header may pass through. Either way, off-by-one assertions downstream.
- **String quoting.** `cond: c4==PASS` parses as a name lookup on `PASS`, not a string comparison. Always quote literal strings.
- **Uppercase operators.** `cond: c1=='X' OR c1=='Y'` — `OR` is treated as a name (`NameError`), not a boolean op. Use lowercase `and`, `or`, `not`.
- **No new columns.** `Filter1` is a *filter*; new or computed columns belong in [[tabular-compute-new-column]].
- **Implicit column-type coercion.** `cN` values are strings until an operator forces int/float; coercion failures skip the row (counted in the dataset metadata, not surfaced in the output stream). If silent-from-data drops are unacceptable, pre-clean upstream or use [[tabular-sql-query]].

All three corpus filters are equality / disjunction over a string column, or a `ConnectedValue` rule. Numeric-range predicates are unattested — if you reach for `cN > X`, you're slightly off the corpus path; verify behavior on a sample.

## See also

- [[iwc-tabular-operations-survey]] — corpus survey and decision record.
- [[tabular-filter-by-regex]] — regex / line-pattern row filter.
- [[tabular-sql-query]] — when SQL semantics (joins, windows) are the right reach.
