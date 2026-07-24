---
type: source-pattern
title: "Nextflow: mapped output cleanup and publishing"
source: nextflow
target: galaxy
source_pattern_kind: lifecycle
implemented_by_patterns:
  - "[[cleanup-sync-and-publish-nonempty-results]]"
  - "[[collection-cleanup-after-mapover-failure]]"
  - "[[sync-collections-by-identifier]]"
  - "[[regex-relabel-via-tabular]]"
  - "[[relabel-via-rules-and-find-replace]]"
  - "[[conditional-gate-on-nonempty-result]]"
  - "[[collection-build-named-bundle]]"
  - "[[tabular-concatenate-collection-to-table]]"
  - "[[tabular-pivot-collection-to-wide]]"
  - "[[collection-unbox-singleton]]"
review_triggers:
  - "publishDir encodes filesystem layout, subdirectories, or saveAs naming."
  - "Mapped outputs are optional, sparse, empty, or failed per element."
  - "Cleanup drops elements from one collection while siblings keep original membership."
  - "Output labels are derived by regex, dynamic closures, task metadata, or filenames."
  - "Final aggregation mixes channels with overlapping identifiers or unclear ordering."
  - "Per-element branch or filter behavior controls what is published."
  - "Publishing expects directory structure rather than labeled Galaxy outputs."
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
summary: "Route Nextflow mapped-output cleanup and publishDir-style intent to Galaxy filtering, relabeling, gating, bundling, and reports."
---

# Nextflow: mapped output cleanup and publishing

Use this when a Nextflow source has mapped process outputs, cleanup/filtering around sparse results, final output aggregation, or `publishDir`/output-layout intent.

## Source signal

- Repeated `tuple(meta, path(...))` outputs from mapped processes.
- Operators like `map`, `filter`, `branch`, `collect`, `toList`, `collectFile`, and `mix` near outputs.
- `publishDir` directives, output `emit:` names, report channels, or version channels.
- Naming cleanup via metadata, regex, filenames, or task-derived labels.

## Galaxy translation

1. Treat mapped process output as a Galaxy collection map-over result.
2. Drop unusable per-element outputs with empty/failed collection filters.
3. If cleanup changes membership, sync sibling collections from cleaned identifiers.
4. Relabel outputs when Nextflow metadata or filenames carried element identity.
5. Aggregate report-ready collections into tables, wide matrices, bundles, or singleton outputs.
6. Gate report/export steps when the whole result may be empty.
7. Translate `publishDir` intent to Galaxy output labels, collections, bundles, or reports; do not preserve filesystem layout literally.

## Pattern handoffs

- Cleanup: [[collection-cleanup-after-mapover-failure]].
- Cleanup + sibling sync + publishing: [[cleanup-sync-and-publish-nonempty-results]].
- Sibling membership sync: [[sync-collections-by-identifier]].
- Label cleanup: [[regex-relabel-via-tabular]], [[relabel-via-rules-and-find-replace]].
- Non-empty report gate: [[conditional-gate-on-nonempty-result]].
- Publishing bundles/reports: [[collection-build-named-bundle]], [[tabular-concatenate-collection-to-table]], [[tabular-pivot-collection-to-wide]], [[collection-unbox-singleton]].

## Pitfalls

- Cleanup is not publishing.
- Dropping bad elements changes collection membership.
- Identifier sync is not order sync.
- `publishDir` paths are source-side filesystem presentation, not Galaxy workflow structure.
- Do not translate arbitrary Groovy output-name logic from syntax alone.

## Evidence posture

This page is grounded in existing Foundry lifecycle and source-shape notes. `publishDir` specifics remain under-supported without direct fixture evidence.
