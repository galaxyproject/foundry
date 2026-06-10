---
type: pattern
pattern_kind: moc
evidence: corpus-observed
title: "Galaxy: sequence patterns"
aliases:
  - "Galaxy sequence pattern MOC"
  - "sequence-record transformation patterns"
  - "IWC sequence pattern map"
tags:
  - pattern
  - target/galaxy
  - topic/galaxy-transform
  - topic/sequence-transform
status: draft
created: 2026-06-10
revised: 2026-06-10
revision: 1
ai_generated: true
summary: "Use this MOC to choose corpus-grounded Galaxy operations on sequence records (FASTA) — interconvert, reformat, merge, length, extract/mask by region."
related_notes:
  - "[[iwc-sequence-operations-survey]]"
related_patterns:
  - "[[sequence-fasta-tabular-interconvert]]"
  - "[[sequence-reformat-line-width]]"
  - "[[sequence-merge-and-dedup]]"
  - "[[sequence-compute-length]]"
  - "[[sequence-extract-by-region]]"
  - "[[relabel-fasta-headers-via-tabular]]"
related_molds:
  - "[[implement-galaxy-tool-step]]"
  - "[[nextflow-summary-to-galaxy-data-flow]]"
  - "[[cwl-summary-to-galaxy-data-flow]]"
  - "[[nextflow-summary-to-galaxy-template]]"
  - "[[cwl-summary-to-galaxy-template]]"
  - "[[paper-summary-to-galaxy-template]]"
  - "[[compare-against-iwc-exemplar]]"
---

# Galaxy: sequence patterns

The runtime-facing map for Galaxy **sequence-record** choices — operations that read, reshape, subset, or interconvert FASTA (nucleotide or protein) records, as opposed to opaque-column [[galaxy-tabular-patterns]], coordinate-feature [[galaxy-interval-patterns]], or container-shaped [[galaxy-collection-patterns]]. Use it before loading raw survey notes; [[iwc-sequence-operations-survey]] is the evidence backing, these pages are the actionable references.

Sequence records are arguably the most fundamental bioinformatics data shape, but in IWC the **record-manipulation** cluster (as opposed to the domain analysis that consumes sequence) is moderate, and its center of gravity is the **FASTA ↔ tabular seam**: the corpus reaches for a table whenever it needs to edit records, especially headers. Reach for the relabel recipe first when your need is header surgery across many records.

## Interconvert (the dominant seam)

- [[sequence-fasta-tabular-interconvert]] — open records to a (header, sequence) table and back (`fasta2tab` / `tab2fasta`) so tabular tools can edit them.

## Reformat & combine

- [[sequence-reformat-line-width]] — rewrap FASTA to a fixed line width (`cshl_fasta_formatter`).
- [[sequence-merge-and-dedup]] — concatenate several FASTAs and drop duplicate records by sequence identity (`fasta_merge_files_and_filter_unique_sequences`).

## Compute

- [[sequence-compute-length]] — emit a (id, length) table for downstream tabular thresholding (`fasta_compute_length`). Per-record length only, not assembly statistics.

## Extract & mask by region (interval/annotation bridge)

- [[sequence-extract-by-region]] — turn coordinates into sequence: extract at BED intervals (`bedtools getfasta`), mask regions by BED (`bedtools maskfasta`), or extract transcript/CDS FASTA from a GFF (`gffread`).

## Recipes

- [[relabel-fasta-headers-via-tabular]] — the high-value construct: edit FASTA headers you cannot easily regex in place — `fasta2tab` → find/replace on column 1 → `tab2fasta`.

## Bridges

- **sequence ↔ tabular** — the dominant seam. `fasta2tab`/`tab2fasta` interconvert; `fasta_compute_length` emits a length table; the relabel recipe lives entirely here. The line: tabular treats the record as opaque columns (header = col 1, sequence = col 2); sequence operations understand FASTA structure. See [[galaxy-tabular-patterns]].
- **sequence ↔ interval** — `getfasta` (intervals → sequence) and `maskfasta` (intervals + sequence → masked sequence) consume coordinate features and emit sequence. [[galaxy-interval-patterns]] owns the BED that feeds them on the output-shape rule; this MOC owns the extraction. See [[sequence-extract-by-region]] and [[galaxy-interval-patterns]].
- **alignment / annotation → sequence** — `samtools_fastx` (BAM → FASTQ/FASTA) and `gffread` (GFF + genome → transcript FASTA) bridge from upstream domains into sequence records. `bamtobed` (BAM → BED) is the interval-side analogue owned by [[galaxy-interval-patterns]].

## Thin — tracked, not yet paged

Corpus-present but single-source; documented so the omission is deliberate. A page follows when a second independent exemplar appears (the same hold-if-thin discipline as the interval MOC):

- **subset by id list** — `seqtk_subseq` (iuc; also does ranges) and `filter_by_fasta_ids` (galaxyp; discarded-complement + regex anchoring) each appear once. When paged, lead with `seqtk_subseq` and footnote `filter_by_fasta_ids`.
- **filter by length** — `fasta_filter_by_length` (one VGP-decontamination use).
- **translate (nt → protein)** — `seqkit_translate` (one metagenomic-gene-catalogue use).
- **FASTQ → FASTA** — `fastq_to_fasta_python` (mgnify reads QC); record-format interconversion at the reads-domain edge.

## Gaps (no corpus exemplar, no page)

Per corpus-first, zero IWC uptake → no page; documented here so the absence is explicit:

- **reverse-complement** (standalone), **sequence sort**, **composition / GC compute**, **standalone dedup** (`seqkit_rmdup`), **EMBOSS `seqret`/`transeq`**, `fasta_nucleotide_changer`. Common in GTN training material and the Tool Shed, but no IWC workflow reaches for them.

These are tracked as IWC-input-blocked candidates; a page follows only when an IWC workflow uses the operation.

## Out of scope

Domain analysis that consumes or emits sequence but does not manipulate records: assembly (`gfastats` — the corpus's largest FASTA-touching tool, all VGP), metagenomic binning, proteomics search-DB build, alignment, annotation, variant calling, search, profiling. These route through tool discovery, not patterns. See [[iwc-sequence-operations-survey]] §6.

## See also

- [[iwc-sequence-operations-survey]] — sequence-operation survey and evidence trail.
- [[galaxy-tabular-patterns]] — companion MOC for opaque-column tabular operations.
- [[galaxy-interval-patterns]] — companion MOC for coordinate-feature operations; shares the extract/mask bridge.
- [[galaxy-collection-patterns]] — companion MOC for collection-container operations.
