---
type: source-pattern
title: "Nextflow: branch, filter, and ifEmpty to Galaxy filters and gates"
source: nextflow
target: galaxy
source_pattern_kind: operator
implemented_by_patterns:
  - "[[galaxy-conditionals-patterns]]"
  - "[[conditional-run-optional-step]]"
  - "[[conditional-route-between-alternative-outputs]]"
  - "[[conditional-transform-or-pass-through]]"
  - "[[conditional-gate-on-nonempty-result]]"
  - "[[collection-cleanup-after-mapover-failure]]"
  - "[[sync-collections-by-identifier]]"
  - "[[cleanup-sync-and-publish-nonempty-results]]"
review_triggers:
  - "Per-element branch routing uses non-trivial predicates."
  - "Branch or filter closure inspects file contents or mutates tuple metadata."
  - "Branch has default, unknown, or discarded data whose Galaxy fate is unclear."
  - "filter drops channel items that must keep sibling collections aligned."
  - "ifEmpty fallback changes required outputs, collection shape, or report semantics."
  - "Translation would rely on FILTER_NULL as primary cleanup."
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
summary: "Route Nextflow branch, filter, and ifEmpty channel idioms to Galaxy collection cleanup, identifier filters, when gates, or review."
---

# Nextflow: branch, filter, and ifEmpty to Galaxy filters and gates

Use this when a Nextflow summary reports `.branch`, `.filter`, or `.ifEmpty`. Do not translate syntax directly; first classify the source intent.

## Source idiom classification

- Static workflow-level condition -> Galaxy `when` gate.
- Mutually exclusive alternative route -> `when` alternatives plus `pick_value`.
- Optional transform with original fallback -> optional branch plus `pick_value`.
- Per-element cleanup after sparse map-over -> collection cleanup/filter recipes.
- Whole-result empty/non-empty report admission -> data-derived boolean gate.
- Arbitrary per-element branch/filter -> review trigger.

## Translation table

| Nextflow source shape | Galaxy target pattern | Notes |
| --- | --- | --- |
| `branch` separates workflow modes from a user parameter | [[conditional-run-optional-step]] or [[conditional-route-between-alternative-outputs]] | Gate whole steps; merge if downstream needs one value. |
| `branch` selects among peer outputs | [[conditional-route-between-alternative-outputs]] | Require compatible branch outputs. |
| `filter` removes empty or failed mapped outputs | [[collection-cleanup-after-mapover-failure]] | Prefer empty/failed filters, not `when`. |
| Cleaned result membership subsets a sibling collection | [[sync-collections-by-identifier]] | Extract identifiers from the truth collection. |
| `ifEmpty` controls final report/export | [[conditional-gate-on-nonempty-result]] | Derive a boolean, then gate report/export. |
| cleanup + sibling sync + publish gate | [[cleanup-sync-and-publish-nonempty-results]] | Use the lifecycle recipe. |

## Pitfalls

- Galaxy `when` is step-level, not arbitrary per-channel-item routing.
- Collection filters clean collection elements; they do not choose branches.
- Identifier filtering filters by labels; it does not inspect dataset state.
- If dropping elements, decide whether sibling collections need membership or order sync.

## Evidence posture

This page is grounded in existing Foundry conditional and transformation surveys. Direct `.filter` and `.ifEmpty` fixture evidence was not regenerated during authoring.
