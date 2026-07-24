---
type: pattern
pattern_kind: recipe
evidence: corpus-observed
title: "Collection: relabel via rules and find/replace"
aliases:
  - "collection relabel via rules and find replace"
  - "structured relabel via Apply Rules"
  - "influenza collection relabel fan-out"
tags:
  - target/galaxy
  - topic/galaxy-transform
  - topic/collection-transform
status: draft
created: 2026-05-02
revised: 2026-05-03
revision: 2
ai_generated: true
summary: "Use Apply Rules, identifier extraction, find/replace, and relabeling for structural fan-out cleanup."
related_notes:
  - "[[iwc-transformations-survey]]"
  - "[[galaxy-apply-rules-dsl]]"
  - "[[nextflow-to-galaxy-channel-shape-mapping]]"
related_patterns:
  - "[[regex-relabel-via-tabular]]"
  - "[[collection-swap-nesting-with-apply-rules]]"
related_molds:
  - "[[implement-galaxy-tool-step]]"
iwc_exemplars:
  - workflow: virology/influenza-isolates-consensus-and-subtyping/influenza-consensus-and-subtyping
    steps:
      - label: "BAM split by reference relabel chain"
      - label: "Repeated Apply Rules swap-nesting around sample and segment collections"
    why: "Shows the dense chain of Apply Rules, identifier extraction, find/replace, relabeling, and Apply Rules regrouping."
    confidence: high
---

# Collection: relabel via rules and find/replace

## Tool

Use this narrow chain when relabeling is embedded in structural collection reshape:

1. A domain tool fans out into a nested collection with noisy identifiers.
2. `__APPLY_RULES__` swaps or regroups collection nesting.
3. `collection_element_identifiers` extracts current identifiers.
4. `tp_find_and_replace` cleans those identifiers.
5. `__RELABEL_FROM_FILE__` applies the cleaned identifiers.
6. A second `__APPLY_RULES__` may restore the downstream grouping.

## When to reach for it

Use this when a tool creates machine-generated names, downstream steps need meaningful segment/sample identifiers, and collection nesting must be regrouped around those identifiers.

Do not generalize this page to every Apply Rules relabel. The strong citation is one influenza workflow. Prefer [[regex-relabel-via-tabular]] unless the workflow has this structural fan-out problem.

This page is about relabeling inside a reshape. Use [[collection-swap-nesting-with-apply-rules]] for pure nesting swaps and [[regex-relabel-via-tabular]] for relabel-only cleanup.

## Parameters

For the Apply Rules portions, expose `identifier0` and `identifier1`, then map list identifiers in the required order. The exact persisted `rules` blob is workflow API state; author the logical rule sequence, then validate gxformat2.

Run `collection_element_identifiers` on the reshaped collection level whose labels need cleanup. Use `tp_find_and_replace` only for the identifier cleanup. Apply the cleaned list with `__RELABEL_FROM_FILE__`.

## Idiomatic shape

Conceptual chain:

```yaml
# domain fan-out tool, e.g. BAM split by reference
# -> __APPLY_RULES__            # regroup list:list axes
# -> collection_element_identifiers
# -> tp_find_and_replace        # clean generated labels
# -> __RELABEL_FROM_FILE__      # apply cleaned labels
# -> __APPLY_RULES__            # regroup again if downstream needs it
```

## Pitfalls

- Do not flatten away the axis you need. The point is preserving both sample and segment/reference axes.
- Extract identifiers at the right level; extracting before the first Apply Rules step can capture the wrong labels.
- Rewrite only tool-added noise. A broad regex can merge distinct segment/sample identifiers.
- `__RELABEL_FROM_FILE__` changes names only. Apply Rules carries the shape change.

## See also

- [[iwc-transformations-survey]] — Recipe B and candidate boundary.
- [[regex-relabel-via-tabular]] — simpler sibling when only labels change.
- [[collection-swap-nesting-with-apply-rules]] — pure swap-nesting operation without relabeling.
