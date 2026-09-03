---
type: source-pattern
title: Nextflow fromFilePairs emits a keyed pair channel
source: nextflow
target: galaxy
source_pattern_kind: channel-shape
implemented_by_patterns:
  - "[[paired-collection-input]]"
tags:
  - target/galaxy
status: draft
created: 2026-07-26
revised: 2026-07-26
revision: 1
summary: fromFilePairs yields (sampleId, [r1, r2]) tuples, which convert to a paired dataset collection.
review_triggers:
  - The converted workflow declares two separate FASTQ inputs where the source had one channel.
---

# `fromFilePairs` emits a keyed pair channel

Names a shape on the source side and links the target-side Pattern that implements it — the
`min(1)` link is what keeps this note actionable.
