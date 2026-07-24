---
type: pattern
pattern_kind: operation
evidence: corpus-observed
title: "Interval: window or flank features"
aliases:
  - "bedtools slop in Galaxy"
  - "extend intervals"
  - "build windows around features"
tags:
  - target/galaxy
  - topic/galaxy-transform
  - topic/interval-transform
status: draft
created: 2026-06-10
revised: 2026-06-10
revision: 1
ai_generated: true
summary: "Extend features by a fixed or fractional amount to build neighborhood windows, clamped to chromosome ends; bedtools slopbed with a genome file."
related_notes:
  - "[[iwc-interval-operations-survey]]"
related_patterns:
  - "[[interval-merge-overlapping]]"
  - "[[interval-coverage]]"
  - "[[interval-windowed-coverage]]"
  - "[[galaxy-interval-patterns]]"
related_molds:
  - "[[implement-galaxy-tool-step]]"
iwc_exemplars:
  - workflow: epigenetics/atacseq/atacseq
    steps:
      - label: "get summits +/-500kb"
    why: "slopbed extends MACS2 summits by 500 bp each side to build fixed windows, clamped via a genome file."
    confidence: high
---

# Interval: window or flank features

## Operation

Extend each feature by a fixed (or fractional) amount to build a neighborhood window around it — `summit ± N bp`, `gene + upstream promoter`, `crosslink site ± N`. `toolshed.g2.bx.psu.edu/repos/iuc/bedtools/bedtools_slopbed` ("bedtools SlopBed") does this, clamping the result to chromosome bounds via a genome file so windows never run off the ends.

Single corpus occurrence (`atacseq`), but it recurs in the GTN training corpus — the `transcriptomics/clipseq` tutorial uses SlopBed to widen crosslink sites before fetching sequence, the same "extend to a neighborhood" move in a different domain. That second, independent use is why it earns a page rather than living only as a recipe ingredient.

Parameter names are corpus-inferred from `tool_state`.

## When to reach for it

- Build fixed windows around point/summit features before quantifying coverage (the first step of [[interval-windowed-coverage]]).
- Add flanks to features (promoter regions upstream of genes; padding around peaks) before an overlap or extract step.
- Symmetric (`b`) or asymmetric (`l`/`r`) extension.

To collapse the windows you build (so overlapping ones aren't double-counted), follow with [[interval-merge-overlapping]].

## Parameters

- `inputA`: connected interval set.
- `genome_file_opts.genome_file_opts_selector`: `loc` (a built-in genome) or `hist` (a history chromosome-sizes file). **Required** — slop needs chromosome lengths to clamp extensions; without it, windows can extend past chromosome ends into invalid coordinates.
- `addition.addition_select`: `b` (both sides, the corpus value), `l` (left/upstream only), or `r` (right/downstream only).
  - `addition.b` (or `.l`/`.r`): the extension amount. `"500"` in `atacseq` — **500 bp each side**.
- `pct`: `false` (corpus) treats the amount as base pairs; `true` treats it as a fraction of each feature's length.
- `strand`: `false` (corpus) ignores strand; `true` makes `l`/`r` mean upstream/downstream relative to strand.
- `header`: `false` in the corpus.

```yaml
tool_id: toolshed.g2.bx.psu.edu/repos/iuc/bedtools/bedtools_slopbed/2.31.1+galaxy0
tool_state:
  inputA: { __class__: ConnectedValue }
  genome_file_opts:
    genome_file_opts_selector: loc
    genome: { __class__: ConnectedValue }
  addition: { addition_select: b, b: "500" }
  pct: false
  strand: false
  header: false
```

## Pitfalls

- **Label drift: bp vs kb.** The `atacseq` step is labelled "get summits +/-500kb" and renamed "1kb around each summit", but `b: "500"` is 500 **bp** — a 1 kb total window, not 500 kb. Loose labels are common in IWC; trust the parameter, not the step name.
- **The genome file is mandatory and load-bearing.** It is the only thing keeping extensions inside valid coordinates. A missing or mismatched genome file (wrong assembly) produces silently wrong windows that overrun chromosome ends.
- **`pct: true` changes units.** With `pct: true`, `b: "0.5"` means "extend by half the feature length each side," not 0.5 bp. Easy to conflate with the base-pair mode.
- **`strand: false` makes `l`/`r` genomic, not biological.** For strand-aware upstream/downstream (promoters), set `strand: true`, or `l`/`r` will be wrong for minus-strand features.

## See also

- [[galaxy-interval-patterns]] — the interval pattern map.
- [[interval-windowed-coverage]] — the slop → merge → coverage recipe this op opens.
- [[interval-merge-overlapping]] — collapse overlapping windows after slop.
- [[iwc-interval-operations-survey]] — corpus evidence (and the GTN second-example note).
