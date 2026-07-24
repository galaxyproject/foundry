---
type: source-pattern
title: "Nextflow: mix and collect to report aggregation"
source: nextflow
target: galaxy
source_pattern_kind: operator
implemented_by_patterns:
  - "[[collection-flatten-after-fanout]]"
  - "[[collection-build-named-bundle]]"
  - "[[tabular-concatenate-collection-to-table]]"
  - "[[tabular-pivot-collection-to-wide]]"
  - "[[fan-in-bundle-consume-and-flatten]]"
  - "[[conditional-gate-on-nonempty-result]]"
review_triggers:
  - "mix combines incompatible file or report types into one channel."
  - "mix relies on ordering of emitted values."
  - "collect or toList feeds a tool expecting tuple metadata not preserved as identifiers."
  - "collectFile content concatenation has no existing Galaxy tool equivalent."
  - "Aggregation should skip empty mapped outputs before report generation."
  - "publishDir path or layout semantics are user-visible."
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
summary: "Route Nextflow mix, collect, toList, and collectFile report fan-in idioms to Galaxy aggregation and bundle patterns."
---

# Nextflow: mix and collect to report aggregation

Use this when Nextflow report, version, or QC channels converge before final reporting or publication.

## Source idioms

- `mix(...)` merges report, version, or QC channels.
- `collect()` and `toList()` reduce many emitted values into one downstream invocation.
- `collectFile(...)` materializes one file from channel values.

## Galaxy translation

- If source emits nested outputs for a report consumer, flatten first with [[collection-flatten-after-fanout]].
- If final artifacts should remain separate but published together, use [[collection-build-named-bundle]].
- If per-element tabular outputs should become one long table, use [[tabular-concatenate-collection-to-table]].
- If per-element id/value tables should become one wide matrix, use [[tabular-pivot-collection-to-wide]].
- If several parallel outputs feed a collection-aware consumer before flattening, use [[fan-in-bundle-consume-and-flatten]].
- If aggregation/reporting should only run when cleaned results remain, use [[conditional-gate-on-nonempty-result]].

## Operator-specific decisions

### mix

Usually this is Galaxy wiring or bundle construction. Review if order, duplicate identifiers, or mixed file types matter.

### collect and toList

Usually this becomes one downstream Galaxy tool invocation over a collection. Pick row-bind, wide-pivot, bundle, or flatten based on the downstream consumer shape.

### collectFile

Treat this as one materialized file. Prefer an explicit Galaxy tool or report output. Do not model it as collection assembly unless the downstream object remains a collection.

## Evidence posture

This page is grounded in existing Foundry source-shape and lifecycle notes. Direct Nextflow fixture evidence was not regenerated during authoring.
