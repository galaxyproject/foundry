---
type: pattern
pattern_kind: operation
evidence: corpus-observed
title: "Collection: split identifier via rules"
aliases:
  - "Apply Rules split identifier into nesting"
  - "regex identifier split to list:list"
tags:
  - target/galaxy
  - topic/galaxy-transform
  - topic/collection-transform
status: draft
created: 2026-05-02
revised: 2026-05-03
revision: 2
ai_generated: true
summary: "Use Apply Rules regex columns to split one collection identifier into nested list identifiers."
related_notes:
  - "[[iwc-transformations-survey]]"
  - "[[galaxy-apply-rules-dsl]]"
related_patterns:
  - "[[collection-swap-nesting-with-apply-rules]]"
  - "[[collection-build-list-paired-with-apply-rules]]"
related_molds:
  - "[[implement-galaxy-tool-step]]"
iwc_exemplars:
  - workflow: epigenetics/average-bigwig-between-replicates/average-bigwig-between-replicates
    why: "Splits flat bigWig identifiers into sample-prefix and replicate-suffix nesting with two regex-derived columns."
    confidence: high
---

# Collection: split identifier via rules

## Tool

Use `__APPLY_RULES__` to turn a flat `list` into a nested `list:list` by splitting each element identifier into two parts.

## When to reach for it

Use this when identifiers encode two nesting axes in one string, such as `sampleA_rep1`, and downstream tools need `sampleA -> rep1` nesting.

Do not use this for swapping two existing nesting levels; use [[collection-swap-nesting-with-apply-rules]]. Do not use this to make forward/reverse pairs; use [[collection-build-list-paired-with-apply-rules]] when one parsed axis is a paired-end role.

This page is about deriving list nesting from one identifier. Use [[regex-relabel-via-tabular]] when the collection shape is already right and only labels need cleanup.

## Parameters

The corpus shape uses two parallel `add_column_regex` rules, each with one capture result. Do not encode this as one `group_count: 2` rule when following the IWC exemplar.

Conceptual Apply Rules shape:

```yaml
tool_id: __APPLY_RULES__
tool_state:
  rules:
    - type: add_column_metadata
      value: identifier0
    - type: add_column_regex
      target_column: 0
      expression: "^(.*)_([^_]*)$"
      replacement: "\\1"
    - type: add_column_regex
      target_column: 0
      expression: "^(.*)_([^_]*)$"
      replacement: "\\2"
  mapping:
    list_identifiers: [1, 2]
```

## Pitfalls

- Use two regex rules, not one `group_count: 2` rule, for corpus parity.
- Target the original identifier column both times.
- `^(.*)_([^_]*)$` splits on the last underscore; use a stricter regex if identifiers can contain multiple separators.
- Validate unmatched behavior instead of silently creating empty nesting keys.

## See also

- [[iwc-transformations-survey]] — Apply Rules Shape B and candidate boundary.
- [[galaxy-apply-rules-dsl]] — `add_column_regex` and `list_identifiers` details.
- [[collection-swap-nesting-with-apply-rules]] — regroup existing `list:list` axes.
- [[collection-build-list-paired-with-apply-rules]] — paired-end variant.
