---
type: pattern
pattern_kind: recipe
evidence: corpus-observed
title: "Sequence: relabel FASTA headers via tabular"
aliases:
  - "edit FASTA headers through a table"
  - "fasta2tab find-replace tab2fasta"
  - "inject sample id into FASTA header"
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
summary: "Edit FASTA headers you cannot easily regex in place: fasta2tab, rewrite column 1 with find/replace, then tab2fasta back. The high-value sequence recipe."
related_notes:
  - "[[iwc-sequence-operations-survey]]"
related_patterns:
  - "[[sequence-fasta-tabular-interconvert]]"
  - "[[regex-relabel-via-tabular]]"
  - "[[galaxy-tabular-patterns]]"
  - "[[galaxy-sequence-patterns]]"
related_molds:
  - "[[implement-galaxy-tool-step]]"
iwc_exemplars:
  - workflow: microbiome/pathogen-identification/gene-based-pathogen-identification/Gene-based-Pathogen-Identification
    steps:
      - label: "sample_specific_contigs_tabular_file_preparation"
      - label: "sample_specific_contigs_tabular_file"
      - label: "contigs"
    why: "fasta2tab -> tp_find_and_replace on column 1 (inject per-sample id into the header) -> tab2fasta, the full confirmed round-trip."
    confidence: high
  - workflow: microbiome/metagenomic-genes-catalogue/metagenomic-genes-catalogue
    why: "Same fasta2tab...tab2fasta envelope around tabular header processing of gene records."
    confidence: medium
  - workflow: microbiome/pathogen-identification/pathogen-detection-pathogfair-samples-aggregation-and-visualisation/Pathogen-Detection-PathoGFAIR-Samples-Aggregation-and-Visualisation
    why: "Interconversion pair co-present with tabular text-processing between, relabeling aggregated records."
    confidence: medium
---

# Sequence: relabel FASTA headers via tabular

Use this recipe when the change you need is to the **FASTA header line** — inject a sample id, strip or rewrite a prefix, normalize accession formatting — and doing it on raw FASTA is awkward. The corpus's move is to detour through tabular: open the records so the header is column 1, rewrite that column with ordinary text processing, and close them back to FASTA. It is the highest-value sequence construct in IWC, recurring across the pathogen-identification and metagenomic-gene-catalogue families.

This is a sequence-record cousin of [[regex-relabel-via-tabular]] — that pattern relabels **collection identifiers**; this one relabels the **header inside each sequence record**. Same instinct (let tabular tools do the string work), different target.

## The shape

`fasta2tab` → `tp_find_and_replace` on column 1 → `tab2fasta`. Three steps, the first and last being [[sequence-fasta-tabular-interconvert]].

## 1. Open records to a table

`toolshed.g2.bx.psu.edu/repos/devteam/fasta_to_tabular/fasta2tab` with `descr_columns: "1"`, `keep_first: "0"` — header becomes column 1, full sequence column 2 (`Gene-based-Pathogen-Identification`, step "sample_specific_contigs_tabular_file_preparation").

## 2. Rewrite the header column

`toolshed.g2.bx.psu.edu/repos/bgruening/text_processing/tp_find_and_replace` scoped to **`column: "1"`** so only the header is touched, the sequence in column 2 left intact. In the corpus the replacement is a regex over the whole header with a **connected** `replace_pattern` — the per-sample id is computed upstream (via `compose_text_param`) and injected into every header:

```yaml
tool_id: toolshed.g2.bx.psu.edu/repos/bgruening/text_processing/tp_find_and_replace
tool_state:
  infile: { __class__: ConnectedValue }      # the fasta2tab table
  find_and_replace:
    - find_pattern: ^(.+)$
      replace_pattern: { __class__: ConnectedValue }   # computed per-sample id
      is_regex: true
      global: true
      searchwhere: { searchwhere_select: column, column: "1" }
```

The `searchwhere_select: column` + `column: "1"` pin is load-bearing — without it the find/replace would also rewrite the sequence in column 2.

## 3. Close the table back to FASTA

`toolshed.g2.bx.psu.edu/repos/devteam/tabular_to_fasta/tab2fasta` on the edited table (`Gene-based-Pathogen-Identification`, step "contigs"). Headers carry the new label; sequences are unchanged.

## Why this shape

FASTA headers are interleaved with sequence lines, so a naive find/replace over the whole file risks matching sequence content and cannot easily target "the header only." Splitting to two columns makes the header an addressable column; `searchwhere column: "1"` then guarantees the sequence is never touched. The round-trip is the price of that safety, and it is cheap.

## Pitfalls

- **Scope the find/replace to column 1.** Dropping `searchwhere column: "1"` lets the pattern hit the sequence column and silently corrupt bases. This is the one mistake that turns the recipe from safe to dangerous.
- **Keep the interconversion symmetric.** `descr_columns: "1"` out, single-header-column in. An asymmetric split (see [[sequence-fasta-tabular-interconvert]]) rebuilds malformed headers.
- **A connected `replace_pattern` means the id is computed upstream.** The corpus builds the per-sample string with `compose_text_param` before this step; if you hard-code the replacement you lose the per-sample parameterization that makes the recipe reusable across a collection.
- **Don't reach for this to wrap lines or filter.** Header editing only — width rewrap is [[sequence-reformat-line-width]], record dedup is [[sequence-merge-and-dedup]].

## See also

- [[sequence-fasta-tabular-interconvert]] — the open/close operation this recipe is built on.
- [[regex-relabel-via-tabular]] — the collection-identifier analogue.
- [[galaxy-tabular-patterns]] — the find/replace and compose-param mechanics.
- [[galaxy-sequence-patterns]] — the sequence pattern map.
- [[iwc-sequence-operations-survey]] — corpus evidence.
