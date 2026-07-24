---
type: pattern
pattern_kind: operation
evidence: corpus-observed
title: "Interval: merge overlapping features"
aliases:
  - "bedtools merge in Galaxy"
  - "gops merge in Galaxy"
  - "collapse overlapping intervals"
tags:
  - target/galaxy
  - topic/galaxy-transform
  - topic/interval-transform
status: draft
created: 2026-06-10
revised: 2026-06-10
revision: 1
ai_generated: true
summary: "Collapse overlapping or book-ended intervals within one set into single spans; bedtools mergebed or the gops_merge Operate-on-Genomic-Intervals tool."
related_notes:
  - "[[iwc-interval-operations-survey]]"
related_patterns:
  - "[[interval-overlap-filter]]"
  - "[[interval-windowed-coverage]]"
  - "[[interval-mask-by-set-algebra]]"
  - "[[galaxy-interval-patterns]]"
related_molds:
  - "[[implement-galaxy-tool-step]]"
iwc_exemplars:
  - workflow: epigenetics/atacseq/atacseq
    steps:
      - label: "Merge summits +/-500kb"
    why: "bedtools mergebed collapses overlapping summit windows before coverage."
    confidence: high
  - workflow: VGP-assembly-v2/hi-c-contact-map-for-assembly-manual-curation/hi-c-map-for-assembly-manual-curation
    why: "bedtools mergebed in an assembly-curation context."
    confidence: medium
  - workflow: sars-cov-2-variant-calling/sars-cov-2-consensus-from-variation/consensus-from-variation
    steps:
      - label: "Combined low-coverage regions and filter-failed sites"
    why: "gops_merge (Operate on Genomic Intervals) collapses a concatenated interval set inside the masking recipe."
    confidence: high
---

# Interval: merge overlapping features

## Operation

Collapse overlapping or book-ended intervals **within a single set** into single spans. This is the within-set companion to [[interval-overlap-filter]] (which compares two sets). Two tool families do it, and the corpus uses both as co-equals — pick by which family the surrounding workflow already uses.

- `toolshed.g2.bx.psu.edu/repos/iuc/bedtools/bedtools_mergebed` ("bedtools Merge") — the modern path; epigenetics and VGP.
- `toolshed.g2.bx.psu.edu/repos/devteam/merge/gops_merge_1` ("Merge the overlapping intervals of a dataset", part of "Operate on Genomic Intervals") — the SARS-CoV-2 masking pipeline.

Parameter names are corpus-inferred from `tool_state`.

## When to reach for it

- Deduplicate overlapping windows before quantifying (after [[interval-windowed-coverage]]'s slop step, so a region isn't counted twice).
- Union a concatenated set of regions into non-overlapping spans (the merge step of [[interval-mask-by-set-algebra]]).
- Reduce a noisy feature set to its covered footprint.

This merges a set with **itself**. To combine and compare two different sets, use [[interval-overlap-filter]].

## Parameters (bedtools mergebed)

- `input`: connected interval set.
- `distance`: `-d` gap tolerance. `"0"` (corpus) merges only truly overlapping/book-ended features; a positive value also merges features within that many bp.
- `strand`: `""` (corpus) merges regardless of strand.
- `c_and_o_argument_repeat`: list of `{column, operation}` pairs to carry/aggregate attribute columns through the merge (bedtools `-c`/`-o`). Empty `[]` in the corpus — coordinates only.
- `header`: `false` in the corpus.

```yaml
tool_id: toolshed.g2.bx.psu.edu/repos/iuc/bedtools/bedtools_mergebed/2.31.1
tool_state:
  input: { __class__: ConnectedValue }
  distance: "0"
  strand: ""
  c_and_o_argument_repeat: []
  header: false
```

## Parameters (gops_merge — Operate on Genomic Intervals)

- `input1`: connected interval set.
- `returntype`: `true` returns the merged intervals as 1-based interval records (the corpus value in `consensus-from-variation`).

```yaml
tool_id: toolshed.g2.bx.psu.edu/repos/devteam/merge/gops_merge_1/1.0.0
tool_state:
  input1: { __class__: ConnectedValue }
  returntype: true
```

The `gops_*` "Operate on Genomic Intervals" family (`gops_merge`, `gops_subtract`, `gops_concat`) is co-equal with bedtools in the corpus, not deprecated — the SARS-CoV-2 masking recipe uses it throughout, and `gops_subtract`/`gops_concat` have no bedtools equivalent in the corpus at all. See [[iwc-interval-operations-survey]] for the open redundancy question.

## Pitfalls

- **Sort before merge.** Both tools assume coordinate-sorted input to merge correctly; unsorted input merges only adjacent-in-file overlaps. IWC pipelines arrive pre-sorted from upstream peak/coverage steps, so the corpus rarely shows an explicit sort — but a hand-built set may need one. (Coordinate-aware sort is itself absent from the IWC corpus; see [[galaxy-interval-patterns]] §Gaps.)
- **`distance: 0` is not "no merge."** `0` still merges overlapping and book-ended (touching) features; it is the correct default for "collapse true overlaps." Only a negative value would require an actual overlap of ≥1 bp.
- **Attribute columns are dropped unless you ask.** `c_and_o_argument_repeat: []` keeps coordinates only; score/name columns vanish. Populate the repeat with `{column, operation}` pairs to carry them.
- **`gops_merge` `returntype`.** Leaving it unset changes the output coordinate convention; the corpus sets `true`.

## See also

- [[galaxy-interval-patterns]] — the interval pattern map.
- [[interval-mask-by-set-algebra]] — uses gops_merge to union a concatenated set.
- [[interval-windowed-coverage]] — merges slop windows before coverage.
- [[iwc-interval-operations-survey]] — corpus evidence and the gops-vs-bedtools redundancy note.
