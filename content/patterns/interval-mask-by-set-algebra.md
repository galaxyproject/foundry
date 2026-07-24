---
type: pattern
pattern_kind: recipe
evidence: corpus-observed
title: "Interval: build a mask by set algebra"
aliases:
  - "compute masking regions"
  - "concat merge subtract intervals"
  - "low-coverage and failed-site mask"
tags:
  - target/galaxy
  - topic/galaxy-transform
  - topic/interval-transform
status: draft
created: 2026-06-10
revised: 2026-06-10
revision: 1
ai_generated: true
summary: "Compute regions from regions: concatenate candidate intervals, merge into non-overlapping spans, then subtract the set to keep. The gops_* set-algebra recipe."
related_notes:
  - "[[iwc-interval-operations-survey]]"
related_patterns:
  - "[[interval-merge-overlapping]]"
  - "[[interval-coverage]]"
  - "[[interval-overlap-filter]]"
  - "[[tabular-filter-by-column-value]]"
  - "[[tabular-synthesize-bed-from-3col]]"
  - "[[galaxy-interval-patterns]]"
related_molds:
  - "[[implement-galaxy-tool-step]]"
iwc_exemplars:
  - workflow: sars-cov-2-variant-calling/sars-cov-2-consensus-from-variation/consensus-from-variation
    steps:
      - label: "Cocatenated low-coverage regions and filter-failed sites"
      - label: "Combined low-coverage regions and filter-failed sites"
      - label: "Masking regions"
    why: "Full concat -> merge -> subtract set-algebra computing the consensus masking regions."
    confidence: high
---

# Interval: build a mask by set algebra

Use this recipe when the output you need is **regions computed from other regions** — a mask, a keep-list, a complement-like set — built by combining and differencing interval sets rather than overlapping them. The SARS-CoV-2 `consensus-from-variation` workflow uses it to compute the genome positions to hard-mask before calling a consensus sequence. It is the flagship interval-algebra recipe in the corpus, and the nearest corpus analogue to "compute a region set" that motivated this MOC — though it is **set algebra (union/difference), not proximity**.

It is built entirely from the legacy "Operate on Genomic Intervals" `gops_*` family, which is co-equal with bedtools here (and the only corpus tool for `subtract`/`concat`).

## The algebra

The target is: `mask = (low-coverage ∪ filter-failed-sites) − called-variant-sites`. Three set operations, in order.

## 1. Build the candidate interval sets

Two inputs arrive as BED-shaped intervals:

- **Low-coverage regions** — from [[interval-coverage]] Mode A: `genomecoveragebed` (bedgraph, `zero_regions: true`) → `Filter1` on `c4 < threshold` ("Low-coverage regions"). The depth threshold is composed at runtime (`compose_text_param` building `c4 < N`). This is a tabular filter on coordinate data; see [[tabular-filter-by-column-value]].
- **Variant-site BEDs** — the called and filter-failed variants are turned into BED intervals with `column_maker`, computing start/end from the VCF `POS` with indel-length arithmetic:

  ```yaml
  ops:
    expressions:
      - { cond: "int(c2) - (len(c3) == 1)", add_column: { mode: R, pos: "2" } }
      - { cond: "int(c2) + ((len(c3) - 1) or 1)", add_column: { mode: R, pos: "3" } }
  ```

  then `change_datatype: bed`. This is a coordinate-aware cousin of [[tabular-synthesize-bed-from-3col]] — it accounts for the variant's reference-allele span, not just a fixed 3-column copy.

## 2. Concatenate (union, with overlaps)

`gops_concat_1` ("Concatenate two datasets into one dataset") joins the low-coverage regions and the filter-failed sites into one interval set ("Cocatenated low-coverage regions and filter-failed sites" — the workflow's own typo preserved). `sameformat: false` lets it concatenate interval files that differ in column count.

## 3. Merge (collapse the union)

`gops_merge_1` collapses the concatenated set into non-overlapping spans ("Combined low-coverage regions and filter-failed sites", `returntype: true`). See [[interval-merge-overlapping]]. After this the union is clean.

## 4. Subtract (difference out what to keep)

`gops_subtract_1` removes the called-variant sites from the merged union, leaving the positions to mask ("Masking regions"). Corpus state: `min: "1"` (minimum 1 bp overlap to subtract), `returntype: -p` (return the pieces remaining).

```yaml
tool_id: toolshed.g2.bx.psu.edu/repos/devteam/subtract/gops_subtract_1/1.0.0
tool_state:
  input1: { __class__: ConnectedValue }   # merged union
  input2: { __class__: ConnectedValue }   # called-variant sites (to keep)
  min: "1"
  returntype: -p
```

## Why this shape

You cannot get "regions that are low-coverage-or-failed but not called" from a single overlap. Union (concat+merge) builds the candidate mask; difference (subtract) carves out the variants you are deliberately keeping. Each step is one set operation; the order matters (merge before subtract, so the subtraction operates on clean spans).

## Pitfalls

- **`zero_regions: true` upstream is load-bearing.** If the coverage step omits zero-depth rows, fully-uncovered spans never enter the union and the mask misses them. See [[interval-coverage]].
- **Concat is not merge.** `gops_concat` stacks intervals (overlaps intact); without the following `gops_merge`, the "union" is not actually unioned and the subtract operates on overlapping garbage.
- **Indel span arithmetic.** The `len(c3)` term in the BED construction accounts for multi-base reference alleles; copying a fixed 3-column BED ([[tabular-synthesize-bed-from-3col]]) would mis-size indel intervals by one or more bp.
- **`gops_*` is co-equal, not deprecated.** Don't "modernize" this recipe to bedtools — bedtools has no corpus `subtract`/`concat`, and the recipe is attested end-to-end in `gops_*`. See [[iwc-interval-operations-survey]].

## See also

- [[galaxy-interval-patterns]] — the interval pattern map.
- [[interval-merge-overlapping]] — the merge step.
- [[interval-coverage]] — produces the low-coverage input.
- [[iwc-interval-operations-survey]] — corpus evidence.
