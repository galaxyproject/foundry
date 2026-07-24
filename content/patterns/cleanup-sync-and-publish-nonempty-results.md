---
type: pattern
pattern_kind: recipe
evidence: corpus-observed
title: "Cleanup, sync, and publish non-empty results"
aliases:
  - "cleanup sync publish nonempty"
  - "mapped output cleanup and sibling sync"
  - "non-empty mapped result publishing"
tags:
  - target/galaxy
  - topic/galaxy-transform
  - topic/collection-transform
status: draft
created: 2026-05-04
revised: 2026-05-04
revision: 1
ai_generated: true
summary: "Clean sparse mapped outputs, keep sibling collections aligned, then gate report publishing on non-empty results."
related_notes:
  - "[[iwc-map-over-lifecycle-survey]]"
related_patterns:
  - "[[collection-cleanup-after-mapover-failure]]"
  - "[[sync-collections-by-identifier]]"
  - "[[harmonize-by-sortlist-from-identifiers]]"
  - "[[conditional-gate-on-nonempty-result]]"
related_molds:
  - "[[implement-galaxy-tool-step]]"
  - "[[nextflow-summary-to-galaxy-data-flow]]"
  - "[[cwl-summary-to-galaxy-data-flow]]"
iwc_exemplars:
  - workflow: amplicon/amplicon-mgnify/mgnify-amplicon-pipeline-v5-rrna-prediction/mgnify-amplicon-pipeline-v5-rrna-prediction
    why: "Filters empty mapped BED outputs, syncs sibling collections from cleaned identifiers, then gates Krona and BIOM exports."
    confidence: high
---

# Cleanup, sync, and publish non-empty results

Use this recipe when a mapped search, extraction, or classification can produce empty per-element outputs and downstream reports should only run when useful results remain.

The key decision is that cleanup is not enough. If sibling collections still represent the original sample set, they must be filtered, sorted, or relabeled to match the cleaned result collection before downstream map-over or report export.

## Recipe

1. Map the domain tool over the input collection.
2. Drop empty/failed element outputs so the cleaned collection contains only usable results. Use replacement only when preserving shape is more important than defining a result-set truth mask.
3. Extract identifiers from the cleaned collection that now represents the usable result set.
4. Filter sibling collections to match those identifiers; add sorting or relabeling only when the downstream consumer needs order or label harmonization.
5. Derive a whole-result non-empty boolean with the vetted collection-to-boolean chain when report/export tools should not run on empty collections.
6. Gate report or export steps with Galaxy `when` conditions.

## Reach For This When

- "No hits" is valid for some samples but breaks downstream aggregation.
- A cleaned result collection must stay aligned with sequence, metadata, or classification sibling collections.
- Final reports should be omitted when there is no meaningful result to publish.

## Operation Handoffs

- Use [[collection-cleanup-after-mapover-failure]] immediately after sparse mapped outputs.
- Use [[sync-collections-by-identifier]] when the cleaned collection defines sibling membership.
- Use [[harmonize-by-sortlist-from-identifiers]] when downstream paired processing depends on order, not just membership.
- Use [[conditional-gate-on-nonempty-result]] for the known-good `collection_element_identifiers -> wc_gnu -> column_maker -> param_value_from_file` gate.

## Pitfalls

- Do not filter sibling inputs from the original collection when the cleaned result collection is the truth set.
- Do not assume identifier sync also guarantees order sync.
- Do not gate per-element routing with Galaxy `when`; use filters/classifiers for per-element behavior and reserve `when` for step-level gates.

## See Also

- [[iwc-map-over-lifecycle-survey]] — Shape B evidence.
- [[galaxy-conditionals-patterns]] — conditional operation map.
