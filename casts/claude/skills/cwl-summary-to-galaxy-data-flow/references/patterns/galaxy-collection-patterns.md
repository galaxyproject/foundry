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
  - pattern
  - target/galaxy
  - topic/galaxy-transform
  - topic/collection-transform
status: draft
created: 2026-05-02
revised: 2026-05-02
revision: 1
ai_generated: true
summary: "Use this MOC to choose corpus-grounded Galaxy collection transformation patterns."
related_notes:
  - "[[iwc-transformations-survey]]"
  - "[[iwc-conditionals-survey]]"
related_patterns:
  - "[[manifest-to-mapped-collection-lifecycle]]"
  - "[[cleanup-sync-and-publish-nonempty-results]]"
  - "[[reshape-relabel-remap-by-collection-axis]]"
  - "[[fan-in-bundle-consume-and-flatten]]"
  - "[[collection-cleanup-after-mapover-failure]]"
  - "[[sync-collections-by-identifier]]"
  - "[[harmonize-by-sortlist-from-identifiers]]"
  - "[[regex-relabel-via-tabular]]"
  - "[[relabel-via-rules-and-find-replace]]"
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
  - "[[paper-summary-to-galaxy-template]]"
  - "[[compare-against-iwc-exemplar]]"
---

# Galaxy: collection patterns

This is the runtime-facing map for Galaxy collection transformation choices. Use it before loading raw survey notes. The survey remains evidence backing; the operation and recipe pages are the actionable references.

## Cleanup

- [[collection-cleanup-after-mapover-failure]] — use `__FILTER_EMPTY_DATASETS__` or `__FILTER_FAILED_DATASETS__` after map-over when empty or errored elements would break downstream steps.
- [[collection-unbox-singleton]] — use `__EXTRACT_DATASET__` with `which: first` when a known one-element collection must become a dataset.

## Map-over Lifecycle Recipes

- [[manifest-to-mapped-collection-lifecycle]] — build collection elements from manifest/table rows, map a tool over them, then relabel or reshape outputs.
- [[cleanup-sync-and-publish-nonempty-results]] — clean sparse mapped outputs, sync siblings from surviving identifiers, then gate final reports.
- [[reshape-relabel-remap-by-collection-axis]] — correct the mapped axis after domain fan-out using Apply Rules and deterministic relabeling.
- [[fan-in-bundle-consume-and-flatten]] — bundle parallel outputs for a collection consumer, then flatten or aggregate results.

## Identifiers

- [[sync-collections-by-identifier]] — membership sync: extract identifiers from one collection and filter or relabel a sibling collection.
- [[harmonize-by-sortlist-from-identifiers]] — order sync: sort one sibling collection by another collection's identifier order.
- [[regex-relabel-via-tabular]] — label rewrite: derive new element identifiers in tabular form and apply them with `__RELABEL_FROM_FILE__`.
- [[relabel-via-rules-and-find-replace]] — relabel inside a structural reshape, currently grounded in the influenza fan-out pattern.

## Structural Reshape

- [[collection-flatten-after-fanout]] — collapse nested collection output to a flat list when the outer axis no longer matters.
- [[collection-build-named-bundle]] — assemble individual outputs into a named collection bundle for publishing or downstream fan-in.
- [[collection-swap-nesting-with-apply-rules]] — use Apply Rules to swap `list:list` axes.
- [[collection-split-identifier-via-rules]] — use Apply Rules regex columns to derive nested list identifiers from one identifier string.
- [[collection-build-list-paired-with-apply-rules]] — use Apply Rules to promote identifier columns into `list:paired` structure.

## Bridges

- [[tabular-to-collection-by-row]] — split a tabular manifest/list into collection elements for map-over.
- [[tabular-concatenate-collection-to-table]] — row-bind a collection of tabular outputs into one table.
- [[tabular-pivot-collection-to-wide]] — outer-join a collection of id/value tabulars into one wide table.

## See also

- [[iwc-transformations-survey]] — collection-transform survey and evidence trail.
- [[galaxy-tabular-patterns]] — companion MOC for tabular operations.
