---
type: pattern
pattern_kind: recipe
evidence: corpus-observed
title: "Interval: windowed coverage around features"
aliases:
  - "coverage in windows around summits"
  - "slop merge coverage"
  - "reads per feature neighborhood"
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
summary: "Quantify signal in fixed neighborhoods around point features: window the features (slop), collapse overlaps (merge), then count reads in each window (coverage)."
related_notes:
  - "[[iwc-interval-operations-survey]]"
related_patterns:
  - "[[interval-window-flank]]"
  - "[[interval-merge-overlapping]]"
  - "[[interval-coverage]]"
  - "[[galaxy-interval-patterns]]"
related_molds:
  - "[[implement-galaxy-tool-step]]"
iwc_exemplars:
  - workflow: epigenetics/atacseq/atacseq
    steps:
      - label: "get summits +/-500kb"
      - label: "Merge summits +/-500kb"
      - label: "Compute coverage on summits +/-500kb"
    why: "slop -> merge -> coverage to quantify reads in fixed windows around MACS2 summits."
    confidence: high
---

# Interval: windowed coverage around features

Use this recipe when you have **point or summit features** and want signal quantified in a fixed neighborhood around each — reads in `summit ± N bp`, coverage in promoter windows. The `atacseq` workflow uses it to count reads in 1 kb windows around MACS2 summits. Three operations, in order.

## 1. Window the features (slop)

`bedtools_slopbed` extends each summit by a fixed amount on both sides to make a window ("get summits +/-500kb"; `addition: { addition_select: b, b: "500" }` — 500 bp each side, a 1 kb window). Requires a genome file to clamp at chromosome ends. See [[interval-window-flank]] for parameters and the bp-vs-kb label-drift gotcha.

## 2. Collapse overlapping windows (merge)

Adjacent summits produce overlapping windows; `bedtools_mergebed` collapses them so a region of read pileup isn't counted twice ("Merge summits +/-500kb"; `distance: "0"`). See [[interval-merge-overlapping]].

## 3. Count reads in each window (coverage)

`bedtools_coveragebed` counts how many reads (from the deduplicated-reads BAM) fall in each merged window ("Compute coverage on summits +/-500kb"; `reduce_or_iterate_selector: iterate`, `hist: false`, `mean: false`). This is [[interval-coverage]] Mode B — region-restricted counts, not genome-wide depth.

## Why this shape

The merge between slop and coverage is the non-obvious step. Without it, overlapping windows double-count shared reads and inflate the per-window signal. Slop defines the neighborhoods, merge makes them disjoint, coverage quantifies — each step is one operation, and dropping merge silently biases the numbers upward.

## Pitfalls

- **Skipping merge double-counts.** This is the recipe's whole reason to exist as a three-step chain rather than slop→coverage. Overlapping windows share reads; coverage over un-merged windows over-reports.
- **Window size vs label.** `b: "500"` is 500 bp; the step's "500kb" label is wrong (see [[interval-window-flank]]). Verify the actual extension against the biology you want.
- **Coverage mode.** Use [[interval-coverage]] Mode B (`coveragebed`, reads-in-regions) here, not Mode A (`genomecoveragebed`, genome-wide) — you already have the regions and want per-region counts.
- **Genome file consistency.** Slop's genome file must match the alignment reference, or windows land at coordinates the reads can't occupy.

## See also

- [[galaxy-interval-patterns]] — the interval pattern map.
- [[interval-window-flank]] — the slop step.
- [[interval-merge-overlapping]] — the merge step.
- [[interval-coverage]] — the coverage step (Mode B).
- [[iwc-interval-operations-survey]] — corpus evidence.
