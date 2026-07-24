---
type: pattern
pattern_kind: operation
evidence: corpus-observed
title: "Sequence: merge FASTA and filter unique"
aliases:
  - "fasta_merge_files_and_filter_unique_sequences in Galaxy"
  - "concatenate FASTA and dedup"
  - "merge sequence files unique"
tags:
  - target/galaxy
  - topic/galaxy-transform
  - topic/sequence-transform
status: draft
created: 2026-06-10
revised: 2026-06-10
revision: 1
ai_generated: true
summary: "Concatenate several FASTA files into one and drop duplicate records by sequence identity in a single step; fasta_merge_files_and_filter_unique_sequences."
related_notes:
  - "[[iwc-sequence-operations-survey]]"
related_patterns:
  - "[[sequence-reformat-line-width]]"
  - "[[sequence-fasta-tabular-interconvert]]"
  - "[[galaxy-sequence-patterns]]"
related_molds:
  - "[[implement-galaxy-tool-step]]"
iwc_exemplars:
  - workflow: microbiome/pathogen-identification/pathogen-detection-pathogfair-samples-aggregation-and-visualisation/Pathogen-Detection-PathoGFAIR-Samples-Aggregation-and-Visualisation
    why: "Merge mode over a set of per-sample FASTAs with uniqueness_criterion sequence and an accession_parser regex pulling the id from each header."
    confidence: high
  - workflow: proteomics/clinicalmp/clinicalmp-database-generation/iwc-clinicalmp-database-generation
    steps:
      - label: "Human UniProt Microbial Proteins cRAP for MetaNovo"
    why: "Merge mode building a non-redundant proteomics search database from UniProt, microbial, and cRAP FASTAs."
    confidence: high
---

# Sequence: merge FASTA and filter unique

## Operation

Combine several FASTA files into one **and** drop duplicate records in the same step, where "duplicate" is decided by **sequence identity**, not header. The corpus uses:

`toolshed.g2.bx.psu.edu/repos/galaxyp/fasta_merge_files_and_filter_unique_sequences` ("FASTA Merge Files and Filter Unique Sequences").

The differentiator from a plain text concatenation (`cat`, `tp_cat`) is the dedup: the same sequence can arrive under different headers across inputs, and this tool collapses them to one record. That is the reason to reach for it; if you do not need dedup, a concatenation is simpler. Parameter names below are corpus-inferred from `tool_state`.

## When to reach for it

- Building a **non-redundant reference** — a proteomics search database, a merged contig/sequence set — from per-source FASTAs where the same sequence recurs (the corpus uses it for clinical-MP search DBs and pathogen-contig aggregation).
- Pooling a collection of FASTAs into a single file with duplicates removed.

If you want to keep duplicates (e.g. preserving every record for counting), this is the wrong tool — concatenate instead.

## Parameters

- `batchmode.processmode`: **`merge`** — merge all inputs into one output (vs per-input processing).
- `batchmode.input_fastas`: the FASTA set (connected; a collection or multiple inputs).
- `uniqueness_criterion`: **`sequence`** in the corpus — dedup by sequence content. (Dedup-by-header would keep same-sequence/different-header records.)
- `accession_parser`: a regex extracting the accession/id from each header for the retained record. Corpus value `^>([^ ]+).*$` — take the first whitespace-delimited token after `>`.

## Idiomatic shape

```yaml
tool_id: toolshed.g2.bx.psu.edu/repos/galaxyp/fasta_merge_files_and_filter_unique_sequences/fasta_merge_files_and_filter_unique_sequences/1.2.0
tool_state:
  batchmode:
    processmode: merge
    input_fastas: { __class__: ConnectedValue }
  uniqueness_criterion: sequence
  accession_parser: ^>([^ ]+).*$
```

## Pitfalls

- **Dedup is by sequence, not header — confirm that is what you want.** Two genuinely distinct records that happen to share a sequence collapse to one; if headers carry meaning you need to keep, dedup elsewhere or preserve provenance first.
- **`processmode: merge` vs per-input.** Merge pools everything into one file. If you wanted one deduped output *per* input, that is a different mode.
- **`accession_parser` decides which header survives.** A regex that does not match a header shape leaves records mis-parsed; verify it against the actual `>` lines (the corpus's `^>([^ ]+).*$` keeps the first token).
- **Not a concatenation substitute.** If you do not need dedup, this tool's parsing and uniqueness machinery is overhead — use a plain concat.

## See also

- [[sequence-reformat-line-width]] — normalize the merged output's wrapping.
- [[sequence-fasta-tabular-interconvert]] — when dedup or merge needs header logic a table expresses better.
- [[galaxy-sequence-patterns]] — the sequence pattern map.
- [[iwc-sequence-operations-survey]] — corpus evidence.
