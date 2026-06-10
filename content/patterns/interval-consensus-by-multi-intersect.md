---
type: pattern
pattern_kind: recipe
evidence: corpus-observed
title: "Interval: consensus regions by multi-intersect"
aliases:
  - "consensus peaks across replicates"
  - "reproducible peaks by replicate overlap"
  - "multi-intersect then threshold"
tags:
  - pattern
  - target/galaxy
  - topic/galaxy-transform
  - topic/interval-transform
  - topic/collection-transform
status: draft
created: 2026-06-10
revised: 2026-06-10
revision: 1
ai_generated: true
summary: "Find features reproducible across replicates: multi-intersect per-replicate sets, threshold by replicate count, then intersect back against the merged call."
related_notes:
  - "[[iwc-interval-operations-survey]]"
related_patterns:
  - "[[interval-overlap-filter]]"
  - "[[interval-merge-overlapping]]"
  - "[[tabular-filter-by-column-value]]"
  - "[[derive-parameter-from-file]]"
  - "[[galaxy-interval-patterns]]"
related_molds:
  - "[[implement-galaxy-tool-step]]"
iwc_exemplars:
  - workflow: epigenetics/consensus-peaks/consensus-peaks-atac-cutandrun
    steps:
      - label: "compute multi intersect"
      - label: "filter multi intersect"
      - label: "get merged peaks overlapping at least x replicates"
    why: "Full multi-intersect -> count-threshold -> intersect-back consensus shape with a computed replicate threshold."
    confidence: high
  - workflow: epigenetics/consensus-peaks/consensus-peaks-chip-pe
    why: "Same recipe in the ChIP paired-end sibling."
    confidence: high
  - workflow: epigenetics/consensus-peaks/consensus-peaks-chip-sr
    why: "Same recipe in the ChIP single-read sibling."
    confidence: high
---

# Interval: consensus regions by multi-intersect

Use this recipe when you have **one feature set per replicate** (per-replicate MACS2 peaks, per-sample regions) and want the features that are **reproducible across enough replicates**. Three IWC `consensus-peaks` workflows implement it identically; it is the most reusable interval construct in the corpus.

The move has three stages plus a computed threshold:

## 1. Multi-intersect the replicate collection

Feed the collection of per-replicate feature sets into `bedtools_multiintersectbed` ("compute multi intersect"). It returns one row per distinct genomic segment, annotated with **which replicates** cover it (and a count). Corpus state: `tag_select: tag`, `cluster: false`, `filler: "0"`, `header: false`, with the collection connected to `tag.inputs`.

```yaml
tool_id: toolshed.g2.bx.psu.edu/repos/iuc/bedtools/bedtools_multiintersectbed/2.31.1
tool_state:
  tag: { tag_select: tag, inputs: { __class__: ConnectedValue } }
  cluster: false
  filler: "0"
  header: false
```

## 2. Compute the replicate threshold

The "at least X replicates" count is not hard-coded — it is derived from the number of inputs. The corpus counts replicates with `wc_gnu` over the assembled per-replicate table and reduces with `table_compute` (`matrixapply`, `vector_op: min`) to get the threshold integer (`get nb of replicates`, `get min value`). See [[derive-parameter-from-file]] for the file→parameter mechanics.

## 3. Threshold by replicate count

`Filter1` keeps the multi-intersect rows whose replicate-count column meets the threshold (`filter multi intersect`). This is a tabular filter on an interval-derived table — the count column is opaque to coordinates, so [[tabular-filter-by-column-value]] is the right tool, not a coordinate op.

## 4. Intersect back against the merged-sample call

Finally, intersect the peaks called on the **pooled/merged** sample against the thresholded consensus regions with `bedtools_intersectbed` in `iterate` mode, `overlap_mode: [-wa, -wb]` (`get merged peaks overlapping at least x replicates`). This promotes the merged-sample peak coordinates while keeping only those backed by enough replicates. See [[interval-overlap-filter]] for the intersect parameters.

## Why this shape

Multi-intersect alone tells you *where* replicates agree but fragments the genome into overlap segments; the final intersect-back recovers clean, biologically meaningful peak boundaries (from the merged call) filtered to the reproducible set. Doing it the other way — intersecting every replicate pair — does not scale and loses the count semantics.

## Pitfalls

- **The threshold must track replicate count.** Hard-coding "≥2" breaks when the workflow runs on a different number of replicates. The compute-the-threshold step (stage 2) is load-bearing, not incidental.
- **Stage 3 is tabular, stage 4 is coordinate-aware.** Mixing them up — trying to threshold with an interval tool, or recover boundaries with a tabular filter — loses information. The recipe deliberately crosses the interval↔tabular seam twice.
- **Collection axis.** The replicate sets are a Galaxy collection; multi-intersect consumes the whole collection at once (not map-over), while the final intersect runs in `iterate` mode. See [[galaxy-collection-patterns]].

## See also

- [[galaxy-interval-patterns]] — the interval pattern map.
- [[interval-overlap-filter]] — the intersect operations (stages 1 and 4).
- [[tabular-filter-by-column-value]] — the replicate-count threshold (stage 3).
- [[iwc-interval-operations-survey]] — corpus evidence.
