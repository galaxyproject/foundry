---
type: pattern
pattern_kind: moc
evidence: corpus-observed
title: "Galaxy: collection patterns"
aliases:
  - "Galaxy collection pattern MOC"
  - "collection transformation patterns"
  - "IWC collection pattern map"
tags:
  - target/galaxy
  - topic/galaxy-transform
  - topic/collection-transform
status: draft
created: 2026-05-02
revised: 2026-09-22
revision: 2
summary: "Choose a Galaxy collection operation or map-over recipe from the current and required data shapes."
related_notes:
  - "[[iwc-transformations-survey]]"
  - "[[iwc-conditionals-survey]]"
related_patterns:
  - "[[manifest-to-mapped-collection-lifecycle]]"
  - "[[cleanup-sync-and-publish-nonempty-results]]"
  - "[[reshape-relabel-remap-by-collection-axis]]"
  - "[[fan-in-bundle-consume-and-flatten]]"
  - "[[collection-cleanup-after-mapover-failure]]"
  - "[[collection-unbox-singleton]]"
  - "[[sync-collections-by-identifier]]"
  - "[[harmonize-by-sortlist-from-identifiers]]"
  - "[[regex-relabel-via-tabular]]"
  - "[[relabel-via-rules-and-find-replace]]"
  - "[[collection-flatten-after-fanout]]"
  - "[[collection-build-named-bundle]]"
  - "[[collection-swap-nesting-with-apply-rules]]"
  - "[[collection-split-identifier-via-rules]]"
  - "[[collection-build-list-paired-with-apply-rules]]"
  - "[[tabular-to-collection-by-row]]"
  - "[[tabular-concatenate-collection-to-table]]"
  - "[[tabular-pivot-collection-to-wide]]"
related_molds:
  - "[[implement-galaxy-tool-step]]"
  - "[[nextflow-summary-to-galaxy-data-flow]]"
  - "[[cwl-summary-to-galaxy-data-flow]]"
  - "[[nextflow-summary-to-galaxy-template]]"
  - "[[cwl-summary-to-galaxy-template]]"
  - "[[freeform-summary-to-galaxy-template]]"
  - "[[compare-against-iwc-exemplar]]"
---

# Galaxy: collection patterns

Choose by the collection you have and the shape the next Galaxy step needs. The linked operation pages give tool settings and pitfalls. The recipes cover several operations around map-over, where Galaxy runs a step on each collection element. The [[iwc-transformations-survey]] records the IWC evidence behind these choices.

## Enter or leave a collection

- **Table to mapped elements:** [[tabular-to-collection-by-row]] splits a manifest, accession list, or result table into collection elements by row or key. Choose a stable identifier column for later alignment.
- **Individual datasets to a named `list`:** [[collection-build-named-bundle]] assembles separate outputs for publication or a collection-aware consumer. It does not concatenate their file contents.
- **Collection of tables to one long table:** [[tabular-concatenate-collection-to-table]] appends rows. Decide whether to carry each element identifier into every row and whether the inputs have headers.
- **Collection of keyed value tables to one wide table:** [[tabular-pivot-collection-to-wide]] makes elements into columns. Choose the missing-value fill and header behavior for downstream use. Filter empty elements first only when they can occur.
- **Known singleton collection to a dataset:** [[collection-unbox-singleton]] extracts its first element. Use it only when the collection has exactly one meaningful element by construction.

## Keep mapped siblings aligned

First identify what changed. Membership, order, and labels are separate decisions.

- **Empty or failed elements:** [[collection-cleanup-after-mapover-failure]] drops unusable mapped outputs with the matching built-in filter. A replacement dataset preserves the slot when a later step needs the original shape, but it changes the data supplied to that step.
- **Membership:** [[sync-collections-by-identifier]] takes identifiers from the collection that now defines the usable set and filters a sibling to the same names. Filtering preserves the sibling's existing order.
- **Order:** [[harmonize-by-sortlist-from-identifiers]] reorders a sibling by an identifier file when later pairing depends on order. The file must name every element, so this operation does not subset.
- **Labels only:** [[regex-relabel-via-tabular]] derives and applies cleaner element identifiers when the collection structure is already right. [[relabel-via-rules-and-find-replace]] covers relabeling within a structural reshape.

After dropping elements from one mapped result, use its surviving identifiers to filter siblings before relying on per-element correspondence. Add ordering or relabeling only if the downstream step needs it.

## Change the collection axes

- **Nested to flat `list`:** [[collection-flatten-after-fanout]] removes a grouping level after its sample, method, or replicate identity is no longer needed.
- **`list:list` to `list:list` with reversed axes:** [[collection-swap-nesting-with-apply-rules]] changes which level a downstream step maps over.
- **Flat `list` identifiers to `list:list`:** [[collection-split-identifier-via-rules]] derives two list axes from a compound identifier.
- **Identifiers to `list:paired`:** [[collection-build-list-paired-with-apply-rules]] promotes a sample identifier and a forward/reverse role. Use this when pairedness is encoded in identifiers, rather than assuming two sibling collections are aligned.

## Follow a map-over lifecycle

- [[manifest-to-mapped-collection-lifecycle]] — start from manifest rows, map work over collection elements, then stabilize labels and output shape.
- [[cleanup-sync-and-publish-nonempty-results]] — clean sparse mapped results, align siblings to the survivors, and run final reports only when useful results remain.
- [[reshape-relabel-remap-by-collection-axis]] — correct the axis a later tool should map over after domain fan-out. Its evidence is narrow, so review the identifier derivation for the specific workflow.
- [[fan-in-bundle-consume-and-flatten]] — bundle parallel outputs for a collection-aware consumer, then flatten or aggregate its results if the next step needs a pooled shape.

## See also

- [[iwc-transformations-survey]] — collection-transform survey and evidence trail.
- [[galaxy-tabular-patterns]] — companion MOC for tabular operations.
- [[galaxy-interval-patterns]] — companion MOC for coordinate-feature operations.
- [[galaxy-sequence-patterns]] — companion MOC for sequence-record operations.
