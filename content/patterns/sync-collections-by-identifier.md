---
type: pattern
pattern_kind: operation
evidence: corpus-observed
title: "Collection: sync collections by identifier"
aliases:
  - "collection sync by identifier"
  - "collection_element_identifiers to FILTER_FROM_FILE"
  - "filter sibling collection by identifiers"
tags:
  - target/galaxy
  - topic/galaxy-transform
  - topic/collection-transform
status: draft
created: 2026-05-02
revised: 2026-05-03
revision: 2
ai_generated: true
summary: "Use collection_element_identifiers with FILTER_FROM_FILE or RELABEL_FROM_FILE to align sibling collections."
related_notes:
  - "[[iwc-transformations-survey]]"
  - "[[nextflow-to-galaxy-channel-shape-mapping]]"
related_patterns:
  - "[[collection-cleanup-after-mapover-failure]]"
  - "[[harmonize-by-sortlist-from-identifiers]]"
related_molds:
  - "[[implement-galaxy-tool-step]]"
iwc_exemplars:
  - workflow: amplicon/amplicon-mgnify/mgnify-amplicon-pipeline-v5-rrna-prediction/mgnify-amplicon-pipeline-v5-rrna-prediction
    why: "Cleaned SSU and LSU BED identifiers drive filtering of processed sequence collections."
    confidence: high
  - workflow: amplicon/amplicon-mgnify/mgnify-amplicon-pipeline-v5-its/mgnify-amplicon-pipeline-v5-its
    why: "Shows a compact clean, identify, and filter sibling collection shape."
    confidence: high
  - workflow: microbiome/metagenomic-raw-reads-amr-analysis/metagenomic-raw-reads-amr-analysis
    why: "Uses identifier extraction and relabeling to restore per-sample identity downstream."
    confidence: high
---

# Collection: sync collections by identifier

## Tool

Use `collection_element_identifiers` to turn collection element names into a one-column tabular dataset, then feed that file to a collection operation:

- `__FILTER_FROM_FILE__` keeps or drops elements in a sibling collection by identifier.
- `__RELABEL_FROM_FILE__` applies labels from a file when a downstream collection preserved order but lost useful names.

## When to reach for it

Use this when two sibling collections must stay aligned after one side was filtered, cleaned, or reshaped.

The common shape is: collection `X` is filtered to useful results, then identifiers from `X` filter collection `Y` to the same element set. This prevents later per-sample steps from pairing a result from one sample with input from another.

Use the relabel variant when a downstream tool preserves collection order but emits generic or noisy identifiers.

This page is about membership sync. Use [[harmonize-by-sortlist-from-identifiers]] when order must match and [[regex-relabel-via-tabular]] when labels need string cleanup.

Do not use this to detect empty or failed datasets. Run [[collection-cleanup-after-mapover-failure]] first, then use the cleaned collection's identifiers as the mask.

## Parameters

`collection_element_identifiers` has no meaningful knobs in the corpus. Its output is one identifier per line, no header.

For `__FILTER_FROM_FILE__`, the key corpus shape is `how_filter: remove_if_absent`: keep elements whose identifiers appear in the file. Wire downstream steps to `output_filtered`, not `output_discarded`.

For `__RELABEL_FROM_FILE__`, the survey examples use a connected labels file and non-strict relabeling. Prefer stricter mapping when the relabel file should cover every element exactly.

## Idiomatic shape

```yaml
# 1. Extract identifiers from cleaned collection X.
tool_id: toolshed.g2.bx.psu.edu/repos/iuc/collection_element_identifiers/collection_element_identifiers/0.0.2
tool_state:
  input_collection: { __class__: ConnectedValue }

# 2. Keep only matching elements in sibling collection Y.
tool_id: __FILTER_FROM_FILE__
tool_state:
  how:
    how_filter: remove_if_absent
    filter_source: { __class__: ConnectedValue }
  input: { __class__: ConnectedValue }
```

## Pitfalls

- Identifier sync is not necessarily order sync. If downstream zip-like behavior depends on order, verify order or use [[harmonize-by-sortlist-from-identifiers]].
- Extract identifiers from the collection that represents truth after cleanup. In MGnify examples, BED hits drive filtering of processed sequences, not the reverse.
- Relabeling can hide mismatches when strict checks are off. Use only when the upstream shape guarantees correspondence.
- `__FILTER_FROM_FILE__` filters by names in a file; it does not inspect whether files are empty or failed.

## See also

- [[iwc-transformations-survey]] — Recipe A and candidate boundary.
- [[collection-cleanup-after-mapover-failure]] — common upstream cleanup step.
- [[harmonize-by-sortlist-from-identifiers]] — use when sibling order must match, not just membership.
