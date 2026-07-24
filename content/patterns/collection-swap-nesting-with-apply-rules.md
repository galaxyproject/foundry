---
type: pattern
pattern_kind: operation
evidence: corpus-observed
title: "Collection: swap nesting with Apply Rules"
aliases:
  - "regroup list:list by inner identifier"
  - "Apply Rules swap list nesting"
tags:
  - target/galaxy
  - topic/galaxy-transform
  - topic/collection-transform
status: draft
created: 2026-05-02
revised: 2026-05-03
revision: 2
ai_generated: true
summary: "Use Apply Rules to regroup a list:list collection by swapping outer and inner identifier columns."
related_notes:
  - "[[iwc-transformations-survey]]"
  - "[[galaxy-apply-rules-dsl]]"
related_patterns:
  - "[[collection-split-identifier-via-rules]]"
  - "[[collection-build-list-paired-with-apply-rules]]"
  - "[[relabel-via-rules-and-find-replace]]"
related_molds:
  - "[[implement-galaxy-tool-step]]"
iwc_exemplars:
  - workflow: virology/influenza-isolates-consensus-and-subtyping/influenza-consensus-and-subtyping
    steps:
      - label: "Regroup influenza BAM collections between sample and segment axes"
    why: "Shows repeated pure regrouping of list:list collections by swapping outer and inner identifier columns."
    confidence: high
---

# Collection: swap nesting with Apply Rules

## Tool

Use `__APPLY_RULES__` to turn a `list:list` keyed as `sample -> segment` into a `list:list` keyed as `segment -> sample`.

## When to reach for it

Use this when the upstream collection has the right leaf datasets but the wrong nesting axis for downstream map-over.

Do not use this for simple flattening; use [[collection-flatten-after-fanout]] when one axis should disappear. Do not use this to parse one identifier into multiple axes; use [[collection-split-identifier-via-rules]].

This page is about pure axis swap. Use [[relabel-via-rules-and-find-replace]] when noisy identifiers must be cleaned during the reshape.

## Parameters

The rule shape is intentionally small:

1. Add the outer identifier as a column.
2. Add the inner identifier as a column.
3. Map list identifiers in reversed order.

Conceptual Apply Rules shape:

```yaml
tool_id: __APPLY_RULES__
tool_state:
  rules:
    - type: add_column_metadata
      value: identifier0
    - type: add_column_metadata
      value: identifier1
  mapping:
    list_identifiers: [1, 0]
```

Treat this as the logical shape, not a complete serialized workflow API blob.

## Pitfalls

- Reverse the mapping, not the rules. The corpus shape adds `identifier0`, then `identifier1`, then maps `[1, 0]`.
- Check that the input is actually `list:list`; `identifier1` exists only when there is an inner list level.
- Keep pure regrouping separate from relabeling unless noisy identifiers force the heavier recipe.
- Downstream map-over behavior changes after the swap; tools now iterate by the former inner axis.

Footnote: the same workflow uses `__DUPLICATE_FILE_TO_COLLECTION__` before one Apply Rules step as a broadcast setup. That broadcast is barely attested and should not be treated as the main pattern.

## See also

- [[iwc-transformations-survey]] — Apply Rules Shape A and candidate boundary.
- [[galaxy-apply-rules-dsl]] — rule and mapping grammar.
- [[collection-split-identifier-via-rules]] — derive nesting axes from one identifier.
- [[collection-build-list-paired-with-apply-rules]] — promote a paired identifier into `list:paired`.
