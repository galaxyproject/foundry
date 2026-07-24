---
type: pattern
pattern_kind: operation
evidence: corpus-observed
title: "Interval: compute coverage"
aliases:
  - "bedtools genomecov in Galaxy"
  - "bedtools coverage in Galaxy"
  - "coverage track and reads-in-regions"
tags:
  - target/galaxy
  - topic/galaxy-transform
  - topic/interval-transform
status: draft
created: 2026-06-10
revised: 2026-06-10
revision: 1
ai_generated: true
summary: "Two coverage modes: genome-wide depth as a bedgraph (genomecoveragebed) and reads counted in given regions (coveragebed). Same family, different question."
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
  - workflow: sars-cov-2-variant-calling/sars-cov-2-consensus-from-variation/consensus-from-variation
    steps:
      - label: "Depth of coverage"
    why: "genomecoveragebed as a bedgraph with zero_regions, feeding a depth-threshold mask filter."
    confidence: high
  - workflow: transcriptomics/rnaseq-pe/rnaseq-pe
    steps:
      - label: "Scaled Coverage both strands combined"
    why: "genomecoveragebed as a normalized (1/million-reads scale) bedgraph coverage track."
    confidence: high
  - workflow: epigenetics/atacseq/atacseq
    steps:
      - label: "Compute coverage on summits +/-500kb"
    why: "coveragebed counting reads from a BAM that fall inside merged summit windows, in iterate mode."
    confidence: high
---

# Interval: compute coverage

## Operation

"Coverage" in the IWC corpus is **two operations** sharing the bedtools family and the word. Decide which question you are asking before picking the tool.

- **Genome-wide depth → bedgraph.** `toolshed.g2.bx.psu.edu/repos/iuc/bedtools/bedtools_genomecoveragebed` ("bedtools Genome Coverage") emits per-position or per-interval depth across the whole genome. Used as a normalized **coverage track** (transcriptomics) or as the **input to a low-coverage mask** (SARS-CoV-2 consensus).
- **Reads in given regions → counts.** `toolshed.g2.bx.psu.edu/repos/iuc/bedtools/bedtools_coveragebed` ("bedtools Coverage") counts/measures how much of a second dataset (reads, features) falls inside each region of a supplied interval set.

Parameter names are corpus-inferred from `tool_state`.

## When to reach for it

- **Track or mask input** (`genomecoveragebed`): you have alignments (BAM) and want depth everywhere — to visualize, or to threshold into low/high-coverage regions. Feeds [[interval-mask-by-set-algebra]].
- **Reads-in-regions** (`coveragebed`): you already have the regions of interest (peaks, windows, a panel) and want a number per region. This is the quantify step of [[interval-windowed-coverage]].

If you only need a yes/no overlap, not a count, use [[interval-overlap-filter]].

## Mode A — genome-wide depth (genomecoveragebed)

- `input_type.input_type_select`: `bam` (corpus) or `bed`.
- `report.report_select`: **`bg`** (bedgraph) in every corpus case.
  - `report.zero_regions`: `true` emits zero-depth spans as explicit rows — required when a downstream filter must *see* the gaps (the mask use, `consensus-from-variation`). `false` omits them (the track use, `rnaseq-pe`).
  - `report.scale`: a multiplier; a connected `ConnectedValue` carrying 1/million-reads gives a normalized track (`rnaseq-pe`). `"1.0"` for raw depth.
- `split`: `true` splits spliced/blocked alignments into their blocks before counting (corpus: `true` for the mask case).
- `strand`: `""` (both strands) in the corpus.
- `d`, `dz`, `five`, `three`: per-position / 5'/3' report flags (bedtools `-d`/`-dz`/`-5`/`-3`); all `false` in the corpus (bedgraph mode is used instead).

```yaml
tool_id: toolshed.g2.bx.psu.edu/repos/iuc/bedtools/bedtools_genomecoveragebed/2.31.1
tool_state:
  input_type: { input_type_select: bam, input: { __class__: ConnectedValue } }
  report: { report_select: bg, zero_regions: true, scale: "1.0" }
  split: true
  strand: ""
  d: false
  dz: false
  five: false
  three: false
```

## Mode B — reads in given regions (coveragebed)

- `inputA`: the regions to quantify over (connected).
- `reduce_or_iterate`: `iterate` in the corpus — `inputB` (the reads/features dataset) applied per collection element.
- `hist`: `true` reports a coverage histogram per region; `false` (corpus) reports per-region summary columns.
- `mean`: `true` reports mean depth instead of counts; `false` in the corpus.
- `d`, `a_or_b`, `overlap_a`, `overlap_b`, `reciprocal_overlap`, `sorted`, `split`, `strandedness`: report/overlap toggles; corpus defaults (`false`/`null`).

```yaml
tool_id: toolshed.g2.bx.psu.edu/repos/iuc/bedtools/bedtools_coveragebed/2.31.1+galaxy0
tool_state:
  inputA: { __class__: ConnectedValue }
  reduce_or_iterate:
    reduce_or_iterate_selector: iterate
    inputB: { __class__: ConnectedValue }
  hist: false
  mean: false
  d: false
  sorted: false
  split: false
  strandedness: false
```

## Pitfalls

- **Picking the wrong mode.** `genomecoveragebed` answers "how deep is every position?"; `coveragebed` answers "how much falls in these regions?" They are not interchangeable — `coveragebed` needs you to supply the regions; `genomecoveragebed` invents them from the genome.
- **`zero_regions` is correctness, not cosmetics, for masking.** Omit it and zero-depth spans never appear as rows, so a `c4 < threshold` filter cannot select them — the mask silently misses fully-uncovered regions. See [[interval-mask-by-set-algebra]].
- **`split` matters for spliced reads.** RNA-seq/coverage over spliced alignments without `split: true` counts the intron span as covered. The corpus sets `split: true` wherever spliced input is plausible.
- **bedgraph is interval data, but downstream often treats it as tabular.** A `Filter1 c4 < N` on the bedgraph is a tabular filter on coordinate data — the interval↔tabular seam; see [[galaxy-tabular-patterns]].

## See also

- [[galaxy-interval-patterns]] — the interval pattern map.
- [[interval-windowed-coverage]] — slop → merge → coverage recipe (Mode B is its last step).
- [[interval-mask-by-set-algebra]] — Mode A feeds the masking recipe.
- [[iwc-interval-operations-survey]] — corpus evidence.
