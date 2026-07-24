---
type: pattern
pattern_kind: operation
evidence: corpus-observed
title: "Collection: unbox singleton"
aliases:
  - "extract first dataset"
  - "__EXTRACT_DATASET__ singleton"
tags:
  - target/galaxy
  - topic/galaxy-transform
  - topic/collection-transform
status: draft
created: 2026-05-02
revised: 2026-05-03
revision: 2
ai_generated: true
summary: "Use __EXTRACT_DATASET__ with which: first when a one-element collection must become a dataset."
related_notes:
  - "[[iwc-transformations-survey]]"
  - "[[galaxy-apply-rules-dsl]]"
related_molds:
  - "[[implement-galaxy-tool-step]]"
iwc_exemplars:
  - workflow: VGP-assembly-v2/Scaffolding-HiC-VGP8/Scaffolding-HiC-VGP8
    why: "Repeatedly unboxes singleton QC/report outputs such as alignment scores, alignment stats, and snapshots."
    confidence: high
  - workflow: VGP-assembly-v2/Assembly-Hifi-HiC-phasing-VGP4/Assembly-Hifi-HiC-phasing-VGP4
    why: "Shows repeated singleton extraction for Merqury and PNG outputs."
    confidence: high
  - workflow: VGP-assembly-v2/Purge-duplicates-one-haplotype-VGP6b/Purging-duplicates-one-haplotype-VGP6b
    why: "Uses the same VGP reporting and QC singleton extraction shape."
    confidence: high
---

# Collection: unbox singleton

## Tool

Use Galaxy built-in `__EXTRACT_DATASET__` with `which: first`.

This page covers the corpus-dominant shape: an upstream step emits a known one-element collection, but the downstream step or workflow output expects a dataset.

## When to reach for it

Use this when the collection has exactly one meaningful element by construction.

Common IWC context: QC/reporting tools emit images, stats, or HTML outputs as singleton collections after map-over or conditional branching. The workflow immediately extracts the first element so ordinary dataset-consuming steps can use it.

Do not use this to reshape a real multi-element collection. If `N > 1` is meaningful, preserve collection semantics or use a collection-aware operation.

## Parameters

- `input`: connected collection.
- `which: first`: singleton unboxing.

The same tool supports by-index and by-identifier extraction, but the survey signal is overwhelmingly the singleton case. Prefer by-identifier over by-index if you genuinely need arbitrary element extraction.

## Idiomatic shape

```yaml
tool_id: __EXTRACT_DATASET__
tool_state:
  input: { __class__: ConnectedValue }
  which: first
```

Read this as an assertion: this collection has exactly one useful element here.

## Pitfalls

- `which: first` hides bugs if the collection unexpectedly has multiple elements.
- Do not use it as collection filtering; selecting a named element is a different operation.
- Check conditional branches. Singleton extraction often follows single-sample vs multi-sample routing.
- Once unboxed, collection element identifiers are no longer available as collection metadata.

## See also

- [[iwc-transformations-survey]] — Recipe E and candidate boundary.
