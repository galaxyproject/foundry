---
type: pattern
pattern_kind: moc
evidence: corpus-observed
title: "Galaxy: genomic interval patterns"
aliases:
  - "Galaxy interval pattern MOC"
  - "genomic interval transformation patterns"
  - "IWC interval pattern map"
tags:
  - pattern
  - target/galaxy
  - topic/galaxy-transform
  - topic/interval-transform
status: draft
created: 2026-06-10
revised: 2026-06-10
revision: 1
ai_generated: true
summary: "Use this MOC to choose corpus-grounded Galaxy genomic interval operations and recipes on coordinate features."
related_notes:
  - "[[iwc-interval-operations-survey]]"
related_patterns:
  - "[[interval-overlap-filter]]"
  - "[[interval-coverage]]"
  - "[[interval-merge-overlapping]]"
  - "[[interval-window-flank]]"
  - "[[interval-consensus-by-multi-intersect]]"
  - "[[interval-mask-by-set-algebra]]"
  - "[[interval-windowed-coverage]]"
  - "[[tabular-synthesize-bed-from-3col]]"
related_molds:
  - "[[implement-galaxy-tool-step]]"
  - "[[nextflow-summary-to-galaxy-data-flow]]"
  - "[[cwl-summary-to-galaxy-data-flow]]"
  - "[[nextflow-summary-to-galaxy-template]]"
  - "[[cwl-summary-to-galaxy-template]]"
  - "[[paper-summary-to-galaxy-template]]"
  - "[[compare-against-iwc-exemplar]]"
---

# Galaxy: genomic interval patterns

The runtime-facing map for Galaxy **coordinate-feature** choices — operations that understand `chrom/start/end/strand`, as opposed to opaque-column [[galaxy-tabular-patterns]] or container-shaped [[galaxy-collection-patterns]]. Use it before loading raw survey notes; [[iwc-interval-operations-survey]] is the evidence backing, these pages are the actionable references.

This is the smallest of the three data-shape MOCs by design. Interval algebra is a real but moderate cluster in IWC — concentrated in epigenetics peak-consensus and SARS-CoV-2 masking — and its highest-value units are **recipes**, not single operations. Reach for the recipes first when your need is a multi-step construction.

## Overlap

- [[interval-overlap-filter]] — keep/drop/annotate features by overlap with a second set (`bedtools intersect`, or VCF-native `vcfvcfintersect`).

## Set operations

- [[interval-merge-overlapping]] — collapse a set's own overlapping features into single spans (`bedtools merge` / `gops_merge`).
- [[interval-mask-by-set-algebra]] — *(recipe)* compute regions from regions: concat → merge → subtract (the `gops_*` set-algebra mask).

## Windows & coverage

- [[interval-window-flank]] — extend features into neighborhood windows (`bedtools slop`).
- [[interval-coverage]] — genome-wide depth (bedgraph) or reads-in-given-regions counts (`bedtools genomecov` / `coverage`).

## Recipes

- [[interval-consensus-by-multi-intersect]] — reproducible features across replicates: multi-intersect → count-threshold → intersect back.
- [[interval-mask-by-set-algebra]] — compute a mask: union (concat+merge) then difference (subtract).
- [[interval-windowed-coverage]] — quantify signal in fixed windows: slop → merge → coverage.

## Bridges

- **interval ↔ collection** — `bedtools` ops map over per-sample collections via `reduce_or_iterate: iterate`; multi-intersect consumes a whole collection at once. See [[galaxy-collection-patterns]].
- **interval ↔ tabular** — coordinate *construction* ([[tabular-synthesize-bed-from-3col]], and the indel-aware variant-to-BED arithmetic in [[interval-mask-by-set-algebra]]) and coordinate *filtering* (`Filter1 c4 < N` on a bedgraph, [[tabular-filter-by-column-value]]). The line: tabular treats columns as opaque; interval understands coordinates. See [[galaxy-tabular-patterns]].

## Gaps (no corpus exemplar, no page)

Per corpus-first, these have zero IWC uptake and get no pattern page; documented here so the absence is explicit, not an oversight. GTN training-corpus counts below are grounded in [[iwc-interval-operations-survey]] §GTN cross-reference (non-IWC signal):

- **`closest` / proximity** — the "nearest feature + distance" operation. Absent from IWC **and** from the GTN training corpus. This is the operation that motivated the MOC (#268); it cannot be grounded yet.
- **`complement`** — taught in one GTN tutorial (assembly), zero IWC.
- **coordinate-aware `sort`** — taught across three GTN tutorials; IWC sorts intervals with tabular `sort1` instead.
- **`makewindows`, `map`, `window` (`-w` neighborhood join), `annotate`, `jaccard`** — zero in both corpora.

These are tracked as IWC-input-blocked candidates (GitHub `requires-iwc-inputs`); a page follows only when an IWC workflow uses the operation.

## See also

- [[iwc-interval-operations-survey]] — interval-operation survey and evidence trail.
- [[galaxy-tabular-patterns]] — companion MOC for opaque-column tabular operations.
- [[galaxy-collection-patterns]] — companion MOC for collection-container operations.
