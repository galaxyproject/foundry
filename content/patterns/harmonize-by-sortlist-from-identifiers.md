---
type: pattern
pattern_kind: operation
evidence: corpus-and-verified
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
revised: 2026-09-15
revision: 3
summary: "Use SORTLIST with sort_type:file to reorder one collection by another collection's identifiers."
related_notes:
  - "[[iwc-transformations-survey]]"
  - "[[iwc-tabular-operations-survey]]"
related_patterns:
  - "[[sync-collections-by-identifier]]"
  - "[[collection-flatten-after-fanout]]"
related_molds:
  - "[[implement-galaxy-tool-step]]"
verification_paths:
  - verification/workflows/harmonize-by-sortlist-from-identifiers/harmonize-by-sortlist.gxwf-test.yml
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

This is a reorder, not a filter. The identifier file has to name every element exactly once or the job fails, so it cannot be used to subset. Use [[sync-collections-by-identifier]] when membership is what needs changing.

This page is about order harmonization. Use [[sync-collections-by-identifier]] when membership alone is the issue and [[regex-relabel-via-tabular]] when labels need cleanup.

## Parameters

Identifier extraction has no meaningful knobs. `sort_type` is a conditional whose select is also named `sort_type`, and `sort_file` lives inside it:

```yaml
tool_id: __SORTLIST__
tool_state:
  input: { __class__: ConnectedValue }
  sort_type:
    sort_type: file
    sort_file: { __class__: ConnectedValue }
```

Connect the identifier file through `sort_type|sort_file`. It must be the identifiers of the collection whose order should be copied.

## Pitfalls

- Flattening the conditional. `sort_type: file` as a plain string with a sibling `sort_file:` is not the serialized shape; the connection address is `sort_type|sort_file`.
- This cannot drop elements, it fails instead. `SortTool` requires the file's line count to equal the element count, and every line to name an element that exists — otherwise the job errors. A sort file that has drifted out of sync stops the workflow rather than quietly shrinking the collection.
- The reference collection defines truth. If the identifier file comes from the wrong sibling, downstream pairing silently follows the wrong axis.
- Extract identifiers after upstream relabel, filter, or flatten operations, not before.
- Mention `__HARMONIZELISTS__` only as the absent catalog alternative; do not recommend it from corpus evidence.

## See also

- [[iwc-transformations-survey]] — Recipe I, decision table, and Q7 on sort-as-filter.
- [[sync-collections-by-identifier]] — membership sync without explicit order harmonization.
- [[collection-flatten-after-fanout]] — one-step collection-shape cleanup after map-over.
