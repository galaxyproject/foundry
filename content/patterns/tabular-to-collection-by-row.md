---
type: pattern
pattern_kind: operation
evidence: corpus-observed
title: "Tabular: to collection by row"
aliases:
  - "collection from tabular rows"
  - "split_file_to_collection by column"
  - "row fan-out collection"
tags:
  - target/galaxy
  - topic/galaxy-transform
  - topic/collection-transform
  - topic/tabular-transform
status: draft
created: 2026-05-02
revised: 2026-05-03
revision: 2
ai_generated: true
summary: "Use split_file_to_collection split_by:col to fan a tabular into collection elements by row/key."
related_notes:
  - "[[iwc-transformations-survey]]"
  - "[[nextflow-to-galaxy-channel-shape-mapping]]"
related_patterns:
  - "[[tabular-concatenate-collection-to-table]]"
  - "[[sync-collections-by-identifier]]"
related_molds:
  - "[[implement-galaxy-tool-step]]"
iwc_exemplars:
  - workflow: data-fetching/sra-manifest-to-concatenated-fastqs/sra-manifest-to-concatenated-fastqs
    why: "Splits one-column SRA accessions so fasterq_dump can run once per accession."
    confidence: high
  - workflow: sars-cov-2-variant-calling/sars-cov-2-variation-reporting/variation-reporting
    why: "Splits a combined per-clade VCF table into per-clade collection elements."
    confidence: high
  - workflow: epigenetics/consensus-peaks/consensus-peaks-chip-sr
    why: "Turns a sample-list tabular into a collection-shaped input for downstream processing."
    confidence: high
---

# Tabular: to collection by row

## Tool

Use `toolshed.g2.bx.psu.edu/repos/bgruening/split_file_to_collection/split_file_to_collection/0.5.2`.

The IWC-attested shape is `split_by: col`: split a tabular file into a dataset collection, one element per row or key. `id_col` chooses the column that becomes the element identifier. `match_regex` and `sub_regex` clean or extract that identifier.

This is the inverse of [[tabular-concatenate-collection-to-table]], where `collapse_dataset` turns a collection into one tabular dataset.

## When to reach for it

Use this when a single manifest, sample sheet, accession list, or combined results table must become a collection so the next tool can map over each row/key.

Do not use this when the input is already a collection. Do not use this for collection-to-table row-binding; use [[tabular-concatenate-collection-to-table]].

## Parameters

```yaml
tool_id: toolshed.g2.bx.psu.edu/repos/bgruening/split_file_to_collection/split_file_to_collection/0.5.2
tool_state:
  input: { __class__: ConnectedValue }
  split_parms:
    split_by: col
    id_col: "1"
    match_regex: (.*)
    sub_regex: \1
```

- `split_parms.split_by: col`: split by a tabular column.
- `split_parms.id_col`: 1-indexed column whose value becomes the collection element identifier.
- `split_parms.match_regex` / `sub_regex`: regex and replacement used to produce the final identifier.

## Pitfalls

- `id_col` is 1-indexed.
- Pick a stable, unique identifier column; duplicate values produce ambiguous collection elements.
- Regex cleanup is downstream metadata cleanup, not cosmetic only.
- Headers matter. Ensure each split element gets the header behavior the downstream tool expects.

## See also

- [[iwc-transformations-survey]] — Recipe J and candidate boundary.
- [[tabular-concatenate-collection-to-table]] — inverse operation using `collapse_dataset`.
- [[sync-collections-by-identifier]] — downstream collection alignment by element identifiers.
