---
type: pattern
pattern_kind: operation
evidence: corpus-observed
title: "Sequence: reformat FASTA line width"
aliases:
  - "fasta_formatter in Galaxy"
  - "rewrap FASTA"
  - "normalize FASTA line length"
tags:
  - target/galaxy
  - topic/galaxy-transform
  - topic/sequence-transform
status: draft
created: 2026-06-10
revised: 2026-06-10
revision: 1
ai_generated: true
summary: "Rewrap FASTA records to a fixed sequence-line width so downstream tools and viewers get canonical 60/70/80-column output; cshl_fasta_formatter."
related_notes:
  - "[[iwc-sequence-operations-survey]]"
related_patterns:
  - "[[sequence-merge-and-dedup]]"
  - "[[galaxy-sequence-patterns]]"
related_molds:
  - "[[implement-galaxy-tool-step]]"
iwc_exemplars:
  - workflow: amplicon/amplicon-mgnify/mgnify-amplicon-pipeline-v5-quality-control-paired-end/mgnify-amplicon-pipeline-v5-quality-control-paired-end
    steps:
      - label: "Paired-end post quality control FASTA files"
    why: "Rewrap post-QC reads to 60-column FASTA before downstream consumption."
    confidence: high
  - workflow: amplicon/amplicon-mgnify/mgnify-amplicon-pipeline-v5-rrna-prediction/mgnify-amplicon-pipeline-v5-rrna-prediction
    why: "Same width rewrap in the rRNA-prediction sibling of the mgnify family."
    confidence: medium
---

# Sequence: reformat FASTA line width

## Operation

Rewrap FASTA records so each sequence is broken into fixed-width lines (the canonical 60/70/80-column convention) rather than one long line per record or whatever width an upstream tool emitted. The corpus uses one tool:

`toolshed.g2.bx.psu.edu/repos/devteam/fasta_formatter/cshl_fasta_formatter` ("FASTA Width formatter").

The tool is part of the FASTX-Toolkit and can also fold case or emit single-line records, but **the only mode the IWC corpus exercises is width rewrap** — every occurrence is the mgnify amplicon family normalizing reads after quality control. Parameter names below are corpus-inferred from `tool_state`.

## When to reach for it

- A downstream tool, viewer, or diff expects standard wrapped FASTA and an upstream step emitted single-line (or oddly wrapped) sequences.
- You are normalizing reads/contigs for distribution or for a reproducible test fixture and want stable line breaks.

If your need is editing headers rather than wrapping bodies, that is [[sequence-fasta-tabular-interconvert]] + [[relabel-fasta-headers-via-tabular]], not this. Case folding and header rewriting are catalog capabilities of this tool with **zero corpus uptake** — don't reach for them speculatively.

## Parameters

- `input`: the FASTA (connected).
- `width`: characters per sequence line. Corpus value **`"60"`**. `0` would emit each sequence on a single line (unused here).

## Idiomatic shape

```yaml
tool_id: toolshed.g2.bx.psu.edu/repos/devteam/fasta_formatter/cshl_fasta_formatter/1.0.1+galaxy2
tool_state:
  input: { __class__: ConnectedValue }
  width: "60"
```

## Pitfalls

- **Reformatting is not filtering or editing.** This only changes line breaks; record count, ids, and sequence content are unchanged. If duplicates or short records are the problem, see [[sequence-merge-and-dedup]] or filter-by-length.
- **Don't use it as a FASTA validator.** A malformed record may pass through reformatted; it is not a correctness gate.
- **`width: "0"` collapses wrapping.** Single-line-per-record output breaks tools that read fixed-width FASTA; only set it when a consumer explicitly wants unwrapped sequences.

## See also

- [[sequence-merge-and-dedup]] — combine multiple FASTAs and drop duplicates.
- [[galaxy-sequence-patterns]] — the sequence pattern map.
- [[iwc-sequence-operations-survey]] — corpus evidence.
