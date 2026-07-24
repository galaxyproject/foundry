---
type: pattern
pattern_kind: operation
evidence: corpus-observed
title: "Collection: build list paired with Apply Rules"
aliases:
  - "Apply Rules build list:paired"
  - "promote paired identifier with Apply Rules"
tags:
  - target/galaxy
  - topic/galaxy-transform
  - topic/collection-transform
status: draft
created: 2026-05-02
revised: 2026-05-03
revision: 2
ai_generated: true
summary: "Use Apply Rules to promote identifier columns into a list:paired collection, with optional cleanup first."
related_notes:
  - "[[iwc-transformations-survey]]"
  - "[[galaxy-apply-rules-dsl]]"
related_patterns:
  - "[[collection-swap-nesting-with-apply-rules]]"
  - "[[collection-split-identifier-via-rules]]"
related_molds:
  - "[[implement-galaxy-tool-step]]"
iwc_exemplars:
  - workflow: amplicon/dada2/dada2_paired
    why: "Uses identifier columns, sample sorting, list identifiers, and paired identifiers to promote rows into list:paired structure."
    confidence: high
  - workflow: data-fetching/parallel-accession-download/parallel-accession-download
    why: "Flattens deeper download output into list:paired by promoting an inner identifier to the paired role."
    confidence: high
  - workflow: data-fetching/sra-manifest-to-concatenated-fastqs/sra-manifest-to-concatenated-fastqs
    why: "Shows paired promotion with regex cleanup of transient delimiter text before mapping."
    confidence: high
---

# Collection: build list paired with Apply Rules

## Tool

Use `__APPLY_RULES__` to produce a `list:paired` collection by mapping one identifier column to the sample/list level and another to the paired level.

## When to reach for it

Use this when identifiers already encode, or can be cleaned to encode, both the list element identifier and the paired role.

This is not the same as `__ZIP_COLLECTION__`. Use zip only when you already have two sibling collections, one forward and one reverse, with matching order. In IWC, zip is rare; Apply Rules dominates when pairedness is derived from existing identifiers or deeper nesting.

This page is about promoting an identifier into paired-end structure. Use [[collection-split-identifier-via-rules]] when the second derived axis is another list level, not forward/reverse.

## Parameters

Minimal `list:paired` promotion:

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
    list_identifiers: [0]
    paired_identifier: [1]
```

For deeper inputs, add the needed identifier columns and map the innermost paired-role column.

## Pitfalls

- Paired identifiers must normalize to paired roles such as forward/reverse. Do not map arbitrary replicate labels as paired ends.
- Use `paired_identifier`, not a second list identifier, when the second axis is read direction.
- Regex rules append new columns; check column numbers after cleanup.
- Sorting by the wrong column can separate intended pairs.

## Legacy alternative

`__ZIP_COLLECTION__` is the dedicated two-list pairing tool, but the survey found only two corpus uses. Prefer Apply Rules when pairedness is derived from identifiers or deeper nesting; use zip only when forward and reverse sibling collections are already aligned.

## See also

- [[iwc-transformations-survey]] — Apply Rules Shape C and candidate boundary.
- [[galaxy-apply-rules-dsl]] — `paired_identifier` mapping rules.
- [[collection-split-identifier-via-rules]] — split one identifier into two list axes instead of paired role.
- [[collection-swap-nesting-with-apply-rules]] — swap existing list axes.
