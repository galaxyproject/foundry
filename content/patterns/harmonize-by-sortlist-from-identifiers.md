---
type: pattern
pattern_kind: operation
evidence: corpus-observed
title: "Collection: harmonize by sortlist from identifiers"
aliases:
  - "collection harmonize by sortlist from identifiers"
  - "sort sibling collections by identifier file"
  - "SORTLIST file-driven harmonization"
tags:
  - target/galaxy
  - topic/galaxy-transform
  - topic/collection-transform
status: draft
created: 2026-05-02
revised: 2026-05-03
revision: 2
ai_generated: true
summary: "Use SORTLIST with sort_type:file to reorder one collection by another collection's identifiers."
related_notes:
  - "[[iwc-transformations-survey]]"
  - "[[iwc-tabular-operations-survey]]"
related_patterns:
  - "[[sync-collections-by-identifier]]"
  - "[[collection-flatten-after-fanout]]"
related_molds:
  - "[[implement-galaxy-tool-step]]"
iwc_exemplars:
  - workflow: virology/pox-virus-amplicon/pox-virus-half-genome
    why: "Uses identifiers from Pool1 to drive SORTLIST ordering of Pool2."
    confidence: high
  - workflow: VGP-assembly-v2/Scaffolding-HiC-VGP8/Scaffolding-HiC-VGP8
    why: "Uses multiple file-driven SORTLIST steps to align sibling collections by identifier order."
    confidence: high
---

# Collection: harmonize by sortlist from identifiers

## Tool

Use Galaxy built-in `__SORTLIST__` with `sort_type: file`, driven by an identifier list from `collection_element_identifiers`.

This is the corpus-attested harmonization recipe. `__HARMONIZELISTS__` exists in the collection-tools catalog, but the survey found zero corpus uptake.

## When to reach for it

Use this when two sibling collections must line up by element identifier before downstream map-over, zip-like pairing, or parallel per-sample processing.

The usual shape is: extract identifiers from the reference collection, feed that identifier file into `__SORTLIST__`, and sort the sibling collection with `sort_type: file`.

Do not use this if unmatched elements must be preserved; file-driven sort can also filter.

This page is about order harmonization. Use [[sync-collections-by-identifier]] when membership alone is the issue and [[regex-relabel-via-tabular]] when labels need cleanup.

## Parameters

Identifier extraction has no meaningful knobs. For sort:

```yaml
tool_id: __SORTLIST__
tool_state:
  input: { __class__: ConnectedValue }
  sort_type: file
  sort_file: { __class__: ConnectedValue }
```

The `sort_file` must be the identifiers of the collection whose order should be copied.

## Pitfalls

- This can drop elements. Treat `sort_type: file` as reorder-plus-intersect unless you have verified behavior for missing identifiers.
- The reference collection defines truth. If the identifier file comes from the wrong sibling, downstream pairing silently follows the wrong axis.
- Extract identifiers after upstream relabel, filter, or flatten operations, not before.
- Mention `__HARMONIZELISTS__` only as the absent catalog alternative; do not recommend it from corpus evidence.

## See also

- [[iwc-transformations-survey]] — Recipe I, decision table, and Q7 on sort-as-filter.
- [[sync-collections-by-identifier]] — membership sync without explicit order harmonization.
- [[collection-flatten-after-fanout]] — one-step collection-shape cleanup after map-over.
