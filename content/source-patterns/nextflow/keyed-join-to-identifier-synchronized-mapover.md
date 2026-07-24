---
type: source-pattern
title: "Nextflow: keyed join/combine(by:) to identifier-synchronized map-over"
source: nextflow
target: galaxy
source_pattern_kind: operator
implemented_by_patterns:
  - "[[sync-collections-by-identifier]]"
  - "[[harmonize-by-sortlist-from-identifiers]]"
  - "[[regex-relabel-via-tabular]]"
  - "[[tabular-join-on-key]]"
review_triggers:
  - "join uses remainder, failOnMismatch, failOnDuplicate, or mismatch-tolerant behavior."
  - "join or combine(by:) can emit duplicate keys."
  - "Key is not a stable sample or file identifier."
  - "Tuple payload structure cannot be modeled as aligned Galaxy collections."
  - "Unmatched elements must be preserved rather than intersected."
  - "Downstream semantics depend on key order as well as key membership."
  - "combine lacks by: and implies Cartesian expansion."
tags:
  - source/nextflow
  - target/galaxy
status: draft
created: 2026-05-04
revised: 2026-05-04
revision: 1
ai_generated: true
related_notes:
  - "[[nextflow-patterns]]"
summary: "Route Nextflow keyed joins and combine(by:) pairings to Galaxy collection identifier sync, ordering, relabeling, or table joins."
---

# Nextflow: keyed join/combine(by:) to identifier-synchronized map-over

Use this when the source uses `join(...)` or `combine(..., by: ...)` to pair records by a key that should become or match a Galaxy collection element identifier.

Do not use this for unkeyed `combine()`. Treat unkeyed combine as Cartesian expansion and review by default.

## Translation rule

If both sides are already Galaxy collections with matching identifiers and compatible structure, ordinary multi-input mapped wiring may be enough.

If membership, order, or labels may drift, add explicit identifier synchronization before downstream map-over:

1. Extract identifiers from the reference collection.
2. Filter sibling collections by identifiers when membership must match.
3. Sort sibling collections by an identifier file when order must match.
4. Relabel when order is correct but useful element names were lost.

## Choose implementation pattern

- [[sync-collections-by-identifier]] for membership intersection by identifier.
- [[harmonize-by-sortlist-from-identifiers]] for order sync before zip-like mapped consumption.
- [[regex-relabel-via-tabular]] to restore or clean labels before keyed pairing.
- [[tabular-join-on-key]] when the source join is row/table data joining rather than file collection alignment.

## Decision checklist

- What is the key?
- Is the key unique on both sides?
- Is unmatched data dropped, fatal, or preserved?
- Does downstream need membership sync only, order sync too, or relabeling?
- Are payloads file-like collection elements or tabular rows?
- Is one side global or broadcast rather than keyed?

## Pitfalls

- Identifier sync is not order sync.
- File-driven sort can behave like reorder plus intersection; do not use it if unmatched elements must survive.
- Relabeling does not filter or reorder.
- Tabular key joins are different from collection identifier sync.

## Evidence posture

This page is grounded in existing Foundry research and Galaxy implementation patterns. Generated Nextflow fixtures were not present during authoring, so exact operator-flag behavior remains a review trigger.
