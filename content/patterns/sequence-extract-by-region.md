---
type: pattern
pattern_kind: operation
evidence: corpus-observed
title: "Sequence: extract or mask by region"
aliases:
  - "bedtools getfasta in Galaxy"
  - "bedtools maskfasta"
  - "gffread extract transcripts"
  - "intervals to sequence"
tags:
  - target/galaxy
  - topic/galaxy-transform
  - topic/sequence-transform
status: draft
created: 2026-06-10
revised: 2026-06-10
revision: 1
ai_generated: true
summary: "Turn coordinates into sequence: extract FASTA at BED intervals (getfasta), mask regions by BED (maskfasta), or extract transcripts from a GFF (gffread)."
related_notes:
  - "[[iwc-sequence-operations-survey]]"
related_patterns:
  - "[[galaxy-sequence-patterns]]"
  - "[[galaxy-interval-patterns]]"
  - "[[sequence-fasta-tabular-interconvert]]"
related_molds:
  - "[[implement-galaxy-tool-step]]"
iwc_exemplars:
  - workflow: microbiome/pathogen-identification/pathogen-detection-pathogfair-samples-aggregation-and-visualisation/Pathogen-Detection-PathoGFAIR-Samples-Aggregation-and-Visualisation
    why: "bedtools getfasta extracting sequence at a BED of feature coordinates from a history FASTA."
    confidence: high
  - workflow: amplicon/amplicon-mgnify/mgnify-amplicon-pipeline-v5-its/mgnify-amplicon-pipeline-v5-its
    steps:
      - label: "ITS FASTA files"
    why: "bedtools maskfasta hard-masking regions named by a BED with mask character N."
    confidence: high
  - workflow: genome_annotation/annotation-maker/Genome_annotation_with_maker_short
    steps:
      - label: "GFFRead"
    why: "gffread extracting transcript/CDS FASTA from an annotation GFF plus the genome FASTA."
    confidence: high
---

# Sequence: extract or mask by region

## Operation

Turn **coordinates into sequence**: given regions (a BED of intervals, or a GFF of annotated features) and a genome/source FASTA, produce sequence records — either the sub-sequences at those regions, or the source with those regions masked. Three corpus moves share this shape; they differ in what the region set is and whether the output is the extract or the masked whole.

This page sits on the **interval/annotation ↔ sequence bridge**. The regions are produced by interval algebra ([[galaxy-interval-patterns]]) or annotation tools; the output is sequence, which is why these operations live in the sequence MOC and were held *out* of the interval MOC (see [[iwc-sequence-operations-survey]] §5 and the interval survey's scope note). Parameter names below are corpus-inferred from `tool_state`.

## Move 1 — extract FASTA at intervals (`bedtools getfasta`)

`toolshed.g2.bx.psu.edu/repos/iuc/bedtools/bedtools_getfastabed` ("bedtools getfasta"). Pull the sub-sequence at each BED interval out of a FASTA.

- `fasta_source.fasta_source_selector`: **`history`** in the corpus — the source FASTA is a history dataset (connected); `cached` would use a built-in genome.
- `input`: the BED of intervals (connected).
- `nameOnly` / `split` / `strand` / `tab`: output toggles, all **`false`** in the corpus (default name handling, no strand-aware reverse-complement, FASTA not tabular output).

```yaml
tool_id: toolshed.g2.bx.psu.edu/repos/iuc/bedtools/bedtools_getfastabed/2.30.0+galaxy1
tool_state:
  fasta_source: { fasta_source_selector: history, fasta: { __class__: ConnectedValue } }
  input: { __class__: ConnectedValue }
  nameOnly: false
  split: false
  strand: false
  tab: false
```

## Move 2 — mask FASTA regions by BED (`bedtools maskfasta`)

`toolshed.g2.bx.psu.edu/repos/iuc/bedtools/bedtools_maskfastabed` ("bedtools maskfasta"). Keep the whole FASTA but replace the bases inside the BED regions. The corpus instances (mgnify ITS and complete pipelines) rename the masked output "ITS FASTA files".

- `fasta` / `input`: source FASTA and the BED of regions to mask (connected).
- `soft`: **`false`** = hard mask (replace bases with the mask character); `true` would lowercase instead.
- `mc`: mask character, **`N`** in the corpus.
- `fullheader`: **`false`** (use the short header).

```yaml
tool_id: toolshed.g2.bx.psu.edu/repos/iuc/bedtools/bedtools_maskfastabed/2.31.1
tool_state:
  fasta: { __class__: ConnectedValue }
  input: { __class__: ConnectedValue }
  soft: false
  mc: N
  fullheader: false
```

## Move 3 — extract transcript/CDS FASTA from annotation (`gffread`)

`toolshed.g2.bx.psu.edu/repos/devteam/gffread` ("gffread"). Given an annotation GFF/GTF and the genome FASTA, emit the spliced transcript or CDS sequences. Every corpus use is inside a `genome_annotation` pipeline (maker, braker3, helixer, lncRNAs) — the operation is sequence extraction, but its region set comes from an annotation step rather than interval algebra.

- `input`: the GFF/GTF (connected).
- `reference_genome.genome_fasta`: the genome FASTA the features index into (connected).
- The corpus leaves filtering/merging/attribute options at defaults; reach for them only when the annotation needs cleaning first.

## When to reach for each

- **Region → just the sub-sequences**: `getfasta`.
- **Region → the whole source with those spans hidden**: `maskfasta` (e.g. masking low-confidence or repeat regions before a consensus or search).
- **Annotation features → their spliced sequences**: `gffread` (transcripts/CDS from a gene model).

## Pitfalls

- **Strand matters for extraction.** `getfasta` with `strand: false` returns the plus-strand sequence regardless of the feature's strand; set `strand: true` when you need strand-aware (reverse-complemented) extraction. The corpus extracts plus-strand.
- **Soft vs hard mask is a downstream contract.** `maskfasta soft: false` writes `N`s (most tools treat as ambiguous); `soft: true` lowercases (repeat-masker convention some aligners honor). Picking the wrong one silently changes how a downstream tool reads the masked bases.
- **The BED must match the FASTA's coordinate system and chrom names.** A region whose `chrom` does not match a FASTA header yields nothing extracted / nothing masked — no error, just empty or unchanged output. The region set usually comes from [[galaxy-interval-patterns]]; keep names consistent.
- **`gffread` is annotation-domain-resident.** It is a sequence-extraction operation, but it presumes a cleaned gene model; if your features come from interval algebra rather than an annotator, `getfasta` is the simpler fit.

## See also

- [[galaxy-interval-patterns]] — produces the BED regions feeding moves 1–2; cross-MOC bridge.
- [[galaxy-sequence-patterns]] — the sequence pattern map.
- [[sequence-fasta-tabular-interconvert]] — when the extracted records then need header edits.
- [[iwc-sequence-operations-survey]] — corpus evidence and the bridge scope note.
