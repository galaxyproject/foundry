---
type: pattern
pattern_kind: operation
evidence: corpus-and-verified
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
revised: 2026-10-21
revision: 3
summary: "Drop or replace empty or failed elements after map-over with FILTER_EMPTY or FILTER_FAILED before the next collection step."
related_notes:
  - "[[iwc-transformations-survey]]"
  - "[[galaxy-collection-tools]]"
  - "[[galaxy-apply-rules-dsl]]"
related_patterns:
  - "[[sync-collections-by-identifier]]"
  - "[[cleanup-sync-and-publish-nonempty-results]]"
  - "[[conditional-gate-on-nonempty-result]]"
related_molds:
  - "[[implement-galaxy-tool-step]]"
verification_paths:
  - verification/workflows/collection-cleanup-after-mapover-failure/cleanup-empty-after-mapover.gxwf-test.yml
iwc_exemplars:
  - workflow: microbiome/pathogen-identification/pathogen-detection-pathogfair-samples-aggregation-and-visualisation/Pathogen-Detection-PathoGFAIR-Samples-Aggregation-and-Visualisation
    why: "Runs FILTER_FAILED on each of five per-sample collection inputs, produced by upstream PathoGFAIR workflows, before reshaping and aggregating them."
    confidence: high
  - workflow: amplicon/amplicon-mgnify/mgnify-amplicon-pipeline-v5-rrna-prediction/mgnify-amplicon-pipeline-v5-rrna-prediction
    why: "Runs FILTER_EMPTY after mapped cmsearch, SSU and LSU BED extraction, MAPseq, and text-reformatting steps, so samples with no hits leave the collection before the next consumer."
    confidence: high
  - workflow: microbiome/metagenomic-raw-reads-amr-analysis/metagenomic-raw-reads-amr-analysis
    why: "Runs FILTER_FAILED with a replacement on the 'argNorm on Groot output' collection. A text file of no_results lines stands in for each failed sample, so ToolDistillator and MultiQC still receive one element per sample."
    confidence: high
---

# Collection: cleanup after map-over failure

When a tool maps over a collection, some elements can come back empty or in the error state while the rest succeed. Galaxy's `__FILTER_EMPTY_DATASETS__` and `__FILTER_FAILED_DATASETS__` remove those elements, or swap in a replacement dataset, so the next collection step sees only usable inputs. Both inspect each element's dataset. They do not filter by element name. For a keep-or-drop list built from identifiers, use [[sync-collections-by-identifier]].

## Choose the filter

| | `__FILTER_EMPTY_DATASETS__` | `__FILTER_FAILED_DATASETS__` |
|---|---|---|
| Removes | Elements whose dataset has zero bytes, after decompression | Elements whose dataset is not in the `ok` state |
| Input states | Every element must be `ok`. An errored element fails the invocation at this step | Waits until no element is queued or running. A paused element keeps it waiting |
| `replacement` input | Version 1.1.0 only | Versions 1.0.0 and 1.1.0 |
| Accepted inputs | `list` and `list:paired` | `list` and `list:paired` |

The two filters guard different failures. A search that finds nothing for one sample finishes successfully with an empty output, so Filter Empty applies. A job that crashes leaves a red dataset, and only Filter Failed removes it. When one mapped step can produce both, put Filter Failed first and Filter Empty on its output. Filter Empty does not skip errored input. It fails the workflow invocation instead.

Both tools copy the surviving elements into a new collection with the same identifiers, order, and collection type. Galaxy does not copy the underlying files, so the filtered collection adds no quota usage.

## Drop empty results after a mapped search

```yaml
- id: drop_empty
  label: drop_empty
  tool_id: __FILTER_EMPTY_DATASETS__
  tool_version: 1.1.0
  in:
    - id: input
      source: search_hits/out_file1
  out:
    - id: output
  tool_state:
    input:
      __class__: ConnectedValue
```

Here `search_hits` is a `Grep1` step mapped over a three-sample list. Sample B has no matching rows, so its output is zero bytes, and `drop_empty` returns a two-element list keyed `sampleA` and `sampleC`.

Empty means zero bytes, not zero rows. Galaxy treats an element as empty only when its file has no data or decompresses to nothing. A result that keeps a header line, or ends in a single newline, is not empty and passes through. If the producing tool writes a header even when it finds nothing, drop the header in that tool or filter on row count before using Filter Empty.

Filter Empty can return an empty list when every sample is empty. To skip report or export steps in that case, use [[conditional-gate-on-nonempty-result]].

## Drop failed elements

```yaml
- id: drop_failed
  label: drop_failed
  tool_id: __FILTER_FAILED_DATASETS__
  tool_version: 1.1.0
  in:
    - id: input
      source: per_sample_tool/output
  out:
    - id: output
  tool_state:
    input:
      __class__: ConnectedValue
```

Place Filter Failed directly after the step whose jobs can fail. Galaxy pauses the downstream jobs of a failed element, and Filter Failed treats a paused element as not ready, so it waits instead of removing that element. A filter placed one mapped step too late can therefore stall the invocation.

Filter Failed keeps only `ok` datasets. It does not distinguish an error from other terminal non-`ok` states, such as failed metadata. The built-in `__KEEP_SUCCESS_DATASETS__` tool applies the same `ok` test but also accepts and drops paused elements. No IWC workflow uses it.

## Keep collection length with a replacement

Connect a dataset to `replacement` when the next step needs every sample present, for example to line the collection up element by element with a sibling, or to give a report one row per sample. The filter puts the replacement in each bad element's place, keeping that element's identifier and tags:

```yaml
- id: replace_empty
  label: replace_empty
  tool_id: __FILTER_EMPTY_DATASETS__
  tool_version: 1.1.0
  in:
    - id: input
      source: search_hits/out_file1
    - id: replacement
      source: sentinel
  out:
    - id: output
  tool_state:
    input:
      __class__: ConnectedValue
    replacement:
      __class__: ConnectedValue
```

With the same three-sample search, `replace_empty` returns `sampleA`, `sampleB`, and `sampleC`, and `sampleB` holds the sentinel's contents.

The AMR exemplar uses the same `replacement` connection on `__FILTER_FAILED_DATASETS__` 1.1.0. A `tp_text_file_with_recurring_lines` step writes a two-line `no_results` file, and failed argNorm outputs become that file before the ToolDistillator and MultiQC reporting steps.

Pin `tool_version: 1.1.0` on Filter Empty when you connect `replacement`. Filter Empty 1.0.0 has no such input, and Galaxy release 24.2 and earlier ship only that version.

Replacement works only for a flat `list`. Galaxy rejects it on `list:paired` input with a parameter error. Choose a sentinel the next tool reads as a controlled "no result". It becomes real input downstream and appears in reports as data, not as a missing sample.

## Paired and nested collections

For a `list:paired` input, the filter judges each pair as a unit. If either the forward or the reverse dataset is bad, the whole pair is dropped. For a deeper collection such as `list:list`, Galaxy maps the filter over the outer level and filters each inner list separately.

## Pitfalls

- **Dropping elements changes length.** A downstream zip or element-wise comparison with a sibling collection matches by position. Re-sync the sibling with [[sync-collections-by-identifier]], or use a replacement. [[cleanup-sync-and-publish-nonempty-results]] gives the full sequence.
- **An empty-looking file can survive Filter Empty.** A header line, a lone newline, or any other whitespace counts as data.
- **Filter Empty does not repair failures.** Run Filter Failed first when any element can error.
- **`__FILTER_FROM_FILE__` is a different tool.** It keeps or drops elements named in an identifier file and never inspects dataset state or contents.

## Verification

The verified workflow at `verification/workflows/collection-cleanup-after-mapover-failure/` maps `Grep1` over a three-sample list so that one sample's output is zero bytes. Its test checks that Filter Empty drops that identifier, that the replacement form keeps it with the sentinel's contents, and that a header-only result survives the filter.

Filter Failed is not covered by a fixture. A Planemo workflow test fails whenever the history contains an errored dataset, so a deliberately failing mapped job cannot pass. Galaxy's own API test `test_filter_failed_mapping` in `lib/galaxy_test/api/test_workflows.py` checks the drop behavior with a test-only tool. The paused-element, `list:paired`, and replacement-rejection claims come from `FilterDatasetsTool` and `DatabaseOperationTool` in `lib/galaxy/tools/__init__.py`.

## See also

- [[galaxy-collection-tools]]—exact predicates, versions, and inputs for the state, empty, and null filters.
- [[iwc-transformations-survey]]—Recipe C, the corpus counts behind this page.
- [[sync-collections-by-identifier]]—realign sibling collections after elements are dropped.
- [[cleanup-sync-and-publish-nonempty-results]]—the recipe that chains cleanup, sibling sync, and a non-empty gate.
