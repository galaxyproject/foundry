---
type: pattern
pattern_kind: operation
evidence: corpus-observed
title: "Collection: cleanup after map-over failure"
aliases:
  - "cleanup after fanout failure"
  - "FILTER_EMPTY after map-over"
  - "FILTER_FAILED after map-over"
tags:
  - target/galaxy
  - topic/galaxy-transform
  - topic/collection-transform
status: draft
created: 2026-05-02
revised: 2026-05-03
revision: 2
ai_generated: true
summary: "Use FILTER_EMPTY or FILTER_FAILED after map-over when bad elements would break downstream collection steps."
related_notes:
  - "[[iwc-transformations-survey]]"
  - "[[galaxy-apply-rules-dsl]]"
related_patterns:
  - "[[sync-collections-by-identifier]]"
related_molds:
  - "[[implement-galaxy-tool-step]]"
iwc_exemplars:
  - workflow: microbiome/pathogen-identification/pathogen-detection-pathogfair-samples-aggregation-and-visualisation/Pathogen-Detection-PathoGFAIR-Samples-Aggregation-and-Visualisation
    why: "Shows multiple collection inputs passing through FILTER_FAILED before downstream aggregation."
    confidence: high
  - workflow: amplicon/amplicon-mgnify/mgnify-amplicon-pipeline-v5-rrna-prediction/mgnify-amplicon-pipeline-v5-rrna-prediction
    why: "Uses repeated FILTER_EMPTY steps after awk/search reshapes before the next consumer."
    confidence: high
  - workflow: microbiome/metagenomic-raw-reads-amr-analysis/metagenomic-raw-reads-amr-analysis
    why: "Shows rare replacement form that preserves shape with a sentinel file."
    confidence: medium
---

# Collection: cleanup after map-over failure

## Tool

Use Galaxy built-in collection filters:

- `__FILTER_EMPTY_DATASETS__` drops or replaces elements whose datasets are empty.
- `__FILTER_FAILED_DATASETS__` drops or replaces elements whose jobs failed.

These are content/state cleanup gates. They are not identifier-list filters; use [[sync-collections-by-identifier]] when the keep/drop set comes from collection element names.

## When to reach for it

Use this immediately after a tool maps over a collection and some elements may be unusable for the next step.

Use `__FILTER_EMPTY_DATASETS__` when a per-element tool succeeds but produces a zero-line or zero-byte dataset. This is common after tabular, awk, BED, or search-style extraction where "no hits" is a valid per-sample result but the downstream tool expects non-empty input.

Use `__FILTER_FAILED_DATASETS__` when a per-element job may fail and downstream processing should continue on the successful elements.

Use the `replacement` form when downstream shape must stay stable. A sentinel dataset keeps an element slot instead of shortening the collection.

## Parameters

- `input`: collection to inspect.
- `replacement`: optional connected dataset. If omitted, bad elements are removed. If supplied, bad elements are replaced with this dataset.

The simple drop form has no meaningful knobs beyond choosing empty vs failed. The authoring decision is which failure mode you are guarding and whether collection length must be preserved.

## Idiomatic shapes

Drop empty elements before the next collection consumer:

```yaml
tool_id: __FILTER_EMPTY_DATASETS__
tool_state:
  input: { __class__: ConnectedValue }
```

Drop failed elements before aggregation:

```yaml
tool_id: __FILTER_FAILED_DATASETS__
tool_state:
  input: { __class__: ConnectedValue }
```

Replace failed elements with a sentinel dataset:

```yaml
tool_id: __FILTER_FAILED_DATASETS__
in:
  - id: input
    source: argNorm on Groot output
  - id: replacement
    source: _unlabeled_step_8/outfile
```

## Pitfalls

- Empty is not failed. Use `__FILTER_EMPTY_DATASETS__` for successful empty files and `__FILTER_FAILED_DATASETS__` for red elements.
- Dropping changes collection length. If a downstream zip or sibling comparison assumes one-to-one alignment, resync siblings or use a replacement sentinel.
- Replacement changes data semantics. The sentinel becomes real downstream input, so choose a value the next tool treats as controlled no-result data.
- Do not confuse this with `__FILTER_FROM_FILE__`; that tool filters by identifier list and does not inspect dataset state.

## See also

- [[iwc-transformations-survey]] — Recipe C and candidate boundary.
- [[sync-collections-by-identifier]] — follow-up when the cleaned collection should drive sibling filtering or relabeling.
