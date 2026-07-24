---
type: pattern
pattern_kind: operation
evidence: corpus-observed
title: "Sequence: compute record lengths"
aliases:
  - "fasta_compute_length in Galaxy"
  - "FASTA length table"
  - "sequence lengths to tabular"
tags:
  - target/galaxy
  - topic/galaxy-transform
  - topic/sequence-transform
status: draft
created: 2026-06-10
revised: 2026-06-10
revision: 1
ai_generated: true
summary: "Emit a (id, length) table from a FASTA so downstream tabular steps can filter, sort, or threshold records by length; fasta_compute_length."
related_notes:
  - "[[iwc-sequence-operations-survey]]"
related_patterns:
  - "[[sequence-fasta-tabular-interconvert]]"
  - "[[galaxy-sequence-patterns]]"
  - "[[galaxy-tabular-patterns]]"
related_molds:
  - "[[implement-galaxy-tool-step]]"
iwc_exemplars:
  - workflow: VGP-assembly-v2/Purge-duplicate-contigs-VGP6/Purge-duplicate-contigs-VGP6
    why: "fasta_compute_length (keep_first 0, keep_first_word false) producing a per-contig length table for downstream thresholding."
    confidence: high
---

# Sequence: compute record lengths

## Operation

Produce a **tabular (id, length)** table from a FASTA — one row per record — so the length can be filtered, sorted, joined, or thresholded with ordinary tabular tools ([[galaxy-tabular-patterns]]). The corpus uses:

`toolshed.g2.bx.psu.edu/repos/devteam/fasta_compute_length` ("Compute sequence length").

This is a **sequence → tabular** move, narrower than [[sequence-fasta-tabular-interconvert]]: it drops the sequence and keeps only id + length. Keep its scope to the length table; aggregate **assembly statistics** (N50, total bases, GC) are a different concern handled by domain tools (`fasta_stats`, `gfastats`) that this pattern deliberately excludes — see [[iwc-sequence-operations-survey]] §2. Parameter names below are corpus-inferred from `tool_state`.

## When to reach for it

- You need to **filter or threshold records by length** downstream (drop short contigs, keep scaffolds above N bp) and want the length as a column to filter on.
- You need a length distribution table for reporting or to join against other per-record data on the id.

For a one-shot length **filter** where you never need the table, a dedicated filter-by-length tool is more direct; this pattern is for when the length table itself is useful.

## Parameters

- `ref.ref_source`: `history` — the FASTA comes from the history (connected `input`).
- `keep_first`: limit to the first N records; **`"0"`** (all) in the corpus.
- `keep_first_word`: use only the first whitespace-delimited header token as the id; **`false`** in the corpus (full header as id).

## Idiomatic shape

```yaml
tool_id: toolshed.g2.bx.psu.edu/repos/devteam/fasta_compute_length/1.0.3
tool_state:
  ref:
    ref_source: history
    input: { __class__: ConnectedValue }
    keep_first: "0"
    keep_first_word: false
```

## Pitfalls

- **The output is a table, not FASTA.** It carries no sequence — you cannot reconstruct records from it. To keep the sequence alongside, use [[sequence-fasta-tabular-interconvert]] instead.
- **`keep_first_word` changes the join key.** With `false` the whole header is the id; a downstream join on a short accession will miss unless you also trim the header (or set `keep_first_word: true`).
- **Not assembly statistics.** This computes per-record length only. N50 / total-length / GC summaries are out of scope; reaching for `gfastats`/`fasta_stats` pulls in assembly-domain tooling this pattern intentionally avoids.

## See also

- [[sequence-fasta-tabular-interconvert]] — the broader FASTA↔tabular move that keeps the sequence.
- [[galaxy-tabular-patterns]] — filter/sort/threshold the length table.
- [[galaxy-sequence-patterns]] — the sequence pattern map.
- [[iwc-sequence-operations-survey]] — corpus evidence.
