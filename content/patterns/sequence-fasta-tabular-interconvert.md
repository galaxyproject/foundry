---
type: pattern
pattern_kind: operation
evidence: corpus-observed
title: "Sequence: interconvert FASTA and tabular"
aliases:
  - "fasta2tab tab2fasta in Galaxy"
  - "FASTA to tabular and back"
  - "sequence records as a table"
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
summary: "Move sequence records between FASTA and a (header, sequence) table so tabular tools can edit them; fasta2tab one way, tab2fasta back."
related_notes:
  - "[[iwc-sequence-operations-survey]]"
related_patterns:
  - "[[relabel-fasta-headers-via-tabular]]"
  - "[[sequence-compute-length]]"
  - "[[galaxy-sequence-patterns]]"
  - "[[galaxy-tabular-patterns]]"
related_molds:
  - "[[implement-galaxy-tool-step]]"
iwc_exemplars:
  - workflow: microbiome/pathogen-identification/gene-based-pathogen-identification/Gene-based-Pathogen-Identification
    steps:
      - label: "sample_specific_contigs_tabular_file_preparation"
      - label: "contigs"
    why: "fasta2tab (descr_columns 1, keep_first 0) opens records to a two-column table; tab2fasta closes them back after a header edit."
    confidence: high
  - workflow: microbiome/metagenomic-genes-catalogue/metagenomic-genes-catalogue
    why: "Same fasta2tab...tab2fasta envelope around tabular text-processing of gene records."
    confidence: high
  - workflow: proteomics/clinicalmp/clinicalmp-discovery/iwc-clinicalmp-discovery-workflow
    steps:
      - label: "FASTA to Tabular"
    why: "One-way fasta2tab feeding a downstream tabular step — interconversion without a return trip."
    confidence: medium
---

# Sequence: interconvert FASTA and tabular

## Operation

Move sequence records between FASTA and a tabular form where the **header is one column and the sequence is another**, so the corpus's tabular tools ([[galaxy-tabular-patterns]]) can read, filter, join, or rewrite records that FASTA tooling cannot easily touch. This is the most-reached-for sequence operation in IWC and the substrate for the [[relabel-fasta-headers-via-tabular]] recipe.

Two tools, inverse of each other:

- `toolshed.g2.bx.psu.edu/repos/devteam/fasta_to_tabular/fasta2tab` ("FASTA-to-Tabular") — FASTA → tabular.
- `toolshed.g2.bx.psu.edu/repos/devteam/tabular_to_fasta/tab2fasta` ("Tabular-to-FASTA") — tabular → FASTA.

Parameter names below are corpus-inferred from `tool_state`; verify against the live form when authoring.

## When to reach for it

- You need to **edit FASTA headers** — inject a sample id, strip a prefix, regex-rewrite — which is awkward on raw FASTA but trivial as column 1 of a table. Pair with [[relabel-fasta-headers-via-tabular]].
- You need to **join sequence records against a table** (annotations, scores, ids) on the header. Convert one way (`fasta2tab`) and stay tabular (`clinicalmp-discovery` opens a protein DB to tabular and never returns to FASTA).
- You need a per-record table for counting or filtering that carries the sequence too. For length only, [[sequence-compute-length]] is leaner (it drops the sequence).

## Parameters

### fasta2tab

- `input`: the FASTA (connected).
- `descr_columns`: how many leading whitespace-delimited header tokens become their own columns. Corpus pins **`"1"`** — the whole description line is column 1, the sequence is column 2.
- `keep_first`: truncate each sequence to the first N characters; **`"0"`** (keep all) in the corpus.

### tab2fasta

- `input`: the table (connected). Expects the header column(s) then the sequence column.
- Title/sequence column selection mirrors the `descr_columns` split produced by `fasta2tab`; round-trip with the same shape.

## Idiomatic shape

Open records to a two-column table, ready for a column-1 header edit:

```yaml
tool_id: toolshed.g2.bx.psu.edu/repos/devteam/fasta_to_tabular/fasta2tab/1.1.1
tool_state:
  input: { __class__: ConnectedValue }
  descr_columns: "1"
  keep_first: "0"
```

Then convert back after the edit:

```yaml
tool_id: toolshed.g2.bx.psu.edu/repos/devteam/tabular_to_fasta/tab2fasta/1.1.1
tool_state:
  input: { __class__: ConnectedValue }   # the edited table
```

## Pitfalls

- **`descr_columns: "1"` is load-bearing for the round-trip.** If you split the header into multiple columns going out (`descr_columns > 1`) but reassemble assuming one, `tab2fasta` rebuilds the header from the wrong column set. Keep the split symmetric.
- **`keep_first` silently truncates.** A non-zero value clips sequences; the corpus never uses it for interconversion. Leave it `"0"` unless you actually want a prefix.
- **The table is opaque to coordinates.** Once in tabular form the record is just text columns — see [[galaxy-tabular-patterns]]. This is the right tool for header/string edits, the wrong one for anything needing sequence semantics (length, translate, masking live on their own pages).
- **One-way is fine.** Not every use returns to FASTA; `clinicalmp-discovery` converts once and joins. Don't add a `tab2fasta` you don't need.

## See also

- [[relabel-fasta-headers-via-tabular]] — the recipe this operation underpins.
- [[sequence-compute-length]] — when you only want (id, length), not the sequence.
- [[galaxy-sequence-patterns]] — the sequence pattern map.
- [[galaxy-tabular-patterns]] — what to do while the records are tabular.
- [[iwc-sequence-operations-survey]] — corpus evidence.
