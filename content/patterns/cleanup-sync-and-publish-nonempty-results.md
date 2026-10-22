---
type: pattern
pattern_kind: recipe
evidence: corpus-and-verified
title: "Cleanup, sync, and publish non-empty results"
aliases:
  - "cleanup sync publish nonempty"
  - "mapped output cleanup and sibling sync"
  - "non-empty mapped result publishing"
tags:
  - target/galaxy
  - topic/galaxy-transform
  - topic/collection-transform
status: draft
created: 2026-05-04
revised: 2026-10-22
revision: 2
summary: "Clean sparse mapped outputs, keep sibling collections aligned, then gate report publishing on non-empty results."
related_notes:
  - "[[iwc-map-over-lifecycle-survey]]"
related_patterns:
  - "[[collection-cleanup-after-mapover-failure]]"
  - "[[sync-collections-by-identifier]]"
  - "[[harmonize-by-sortlist-from-identifiers]]"
  - "[[conditional-gate-on-nonempty-result]]"
  - "[[conditional-transform-or-pass-through]]"
related_molds:
  - "[[implement-galaxy-tool-step]]"
  - "[[nextflow-summary-to-galaxy-data-flow]]"
  - "[[cwl-summary-to-galaxy-data-flow]]"
verification_paths:
  - verification/workflows/cleanup-sync-and-publish-nonempty-results/cleanup-sync-publish.gxwf-test.yml
iwc_exemplars:
  - workflow: amplicon/amplicon-mgnify/mgnify-amplicon-pipeline-v5-rrna-prediction/mgnify-amplicon-pipeline-v5-rrna-prediction
    steps:
      - id: 12
      - id: 15
      - id: 17
      - id: 19
      - id: 36
      - label: "Krona SSU SILVA"
      - label: "HDF5 SSU SILVA"
    why: "Step 12 drops empty SSU BED results, step 15 lists the survivors, and step 17 filters the 'Processed sequences' input to them so bedtools getfasta (step 19) pairs each BED with its own sample's sequences. Steps 13, 16, 18, and 20 repeat this for LSU. Later, subworkflow 36 derives a boolean from the cleaned Krona-format MAPseq output, and the Krona and BIOM export steps each carry their own when."
    confidence: high
---

# Cleanup, sync, and publish non-empty results

A mapped search or classification can finish successfully for every sample and still return nothing for some of them. Three operations then have to happen in order: drop the empty elements, filter each sibling collection down to the samples that survived, and run report or export steps only when something survived at all. Each operation has its own page. This recipe covers how they connect and what goes wrong when one is left out.

## Recipe

1. Map the domain tool over the samples.
2. Drop empty elements with `__FILTER_EMPTY_DATASETS__`. If jobs can also fail, run `__FILTER_FAILED_DATASETS__` first. [[collection-cleanup-after-mapover-failure]] explains both filters.
3. Extract identifiers from the cleaned collection with `collection_element_identifiers`.
4. Filter each sibling collection to those identifiers with `__FILTER_FROM_FILE__` in `remove_if_absent` mode.
5. Map downstream steps over the cleaned collection and the synced sibling together.
6. Derive a boolean from the collection the report step reads, using the chain on [[conditional-gate-on-nonempty-result]].
7. Give every report or export step its own `when:` on that boolean.

## Clean the results, then filter the sibling

In this excerpt from the verified workflow, `search_hits` maps `Grep1` over three samples and `sampleB` has no matching rows. `sequences` is a sibling list with the same identifiers in the same order, one per-sample file each.

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
- id: kept_identifiers
  label: kept_identifiers
  tool_id: toolshed.g2.bx.psu.edu/repos/iuc/collection_element_identifiers/collection_element_identifiers/0.0.3
  tool_version: 0.0.3
  in:
    - id: input_collection
      source: drop_empty/output
  out:
    - id: output
  tool_state:
    input_collection:
      __class__: ConnectedValue
- id: sync_sequences
  label: sync_sequences
  tool_id: __FILTER_FROM_FILE__
  in:
    - id: input
      source: sequences
    - id: how|filter_source
      source: kept_identifiers/output
  out:
    - id: output_filtered
    - id: output_discarded
  tool_state:
    input:
      __class__: ConnectedValue
    how:
      how_filter: remove_if_absent
      filter_source:
        __class__: ConnectedValue
```

`drop_empty` returns `sampleA` and `sampleC`. `kept_identifiers` writes those two names, one per line, and `sync_sequences` keeps only the matching sequences. The sibling being filtered is usually an earlier collection, often a workflow input. MGnify filters its `Processed sequences` input this way. What matters is where the identifiers come from. Read them from the cleaned collection, because identifiers from any collection that still includes `sampleB` keep its sequence too.

## Pair the cleaned results with the synced sibling

A step with two collection inputs, both mapped over, pairs them element by element:

```yaml
- id: pair_hits_with_sequences
  label: pair_hits_with_sequences
  tool_id: cat1
  tool_version: 1.0.0
  in:
    - id: input1
      source: drop_empty/output
    - id: queries_0|input2
      source: sync_sequences/output_filtered
  out:
    - id: out_file1
  tool_state:
    input1:
      __class__: ConnectedValue
    queries:
      - input2:
          __class__: ConnectedValue
```

Galaxy pairs linked collections by position, not by identifier. Before it maps the step, it checks only that the collections have the same type and number of elements, and it refuses the step with `Cannot match collection types.` when they differ. Without the sync, this step would receive two results and three sequences and fail. With it, `sampleA`'s hits are paired with `sampleA`'s sequence. MGnify's bedtools getfasta step pairs each cleaned BED collection with its synced sequences in the same way.

The sync fixes membership, not order. `__FILTER_FROM_FILE__` keeps the sibling's own order and ignores the order of the identifier file. Membership sync is enough when both collections come from the same ordered input, as in MGnify and the verified workflow. When the sibling arrived in a different order, sort it with [[harmonize-by-sortlist-from-identifiers]] before pairing, or a same-length pair will match the wrong samples without any error.

If every sample must stay in the report, connect a `replacement` dataset to Filter Empty instead of dropping elements. The cleaned collection then keeps all its elements, so the sibling stays aligned without steps 3 and 4. The sentinel reaches downstream tools as real data. The replacement input exists only on Filter Empty 1.1.0 and only for flat lists, as [[collection-cleanup-after-mapover-failure]] explains.

## Gate report steps on a non-empty result

Filter Empty can return an empty list when no sample has results. A mapped step over an empty list runs no jobs and produces another empty list. A step that reads the whole collection as one input, such as Krona's `multiple="True"` input or `collapse_dataset`, still runs one job with nothing in it. Galaxy's API tests `test_empty_list_mapping` and `test_empty_list_reduction` show both behaviors. The gate keeps that job from running.

Derive the boolean from the collection the report step reads. In the verified workflow, the report reads the paired collection, so the identifier chain counts that collection's elements. MGnify gates its Krona chart on a later collection than its BED cleanup. Subworkflow 36 counts the elements of step 28, a separate Filter Empty on MAPseq's Krona-format output. The verified workflow's `has_results` step is the last link of the chain described on [[conditional-gate-on-nonempty-result]].

```yaml
- id: report
  label: report
  tool_id: toolshed.g2.bx.psu.edu/repos/nml/collapse_collections/collapse_dataset/5.1.0
  tool_version: "5.1.0"
  in:
    - id: input_list
      source: pair_hits_with_sequences/out_file1
    - id: when
      source: has_results/boolean_param
  out:
    - id: output
  tool_state:
    input_list:
      __class__: ConnectedValue
    filename:
      add_name: true
      place_name: same_multiple
    one_header: false
  when: $(inputs.when)
```

Each step needs its own `when:`. A skipped step produces a `null` placeholder, and a step that reads it runs anyway, as [[conditional-transform-or-pass-through]] describes. MGnify puts the same boolean on each of its BIOM conversion steps as well as on Krona.

## Pitfalls

- **Identifiers taken from the wrong collection.** If they come from the uncleaned results or the original input, every sample passes the sibling filter and the pairing step fails on mismatched lengths.
- **Sibling in a different order.** A same-length linked map-over pairs by position. Sort the sibling first when it does not share the cleaned collection's origin.
- **Errored elements.** Filter Empty fails the invocation when any input element is in the error state. Put Filter Failed before it.
- **Gate on the wrong collection.** If the report reads a collection that had its own cleanup, count that collection, not the first cleaned one.
- **Gating only the first report step.** A skip does not reach later steps. Gate each one.
- **Using the gate to drop samples.** This recipe's gate makes one decision for the whole invocation. Cleanup decides which samples continue.

## Verification

The verified workflow at `verification/workflows/cleanup-sync-and-publish-nonempty-results/` runs the whole chain on three samples. In the first test, `sampleB` has no hits. The test checks that only `sampleA` and `sampleC` remain in the cleaned identifiers and in the synced sequences, that each paired element holds its own sample's hit followed by its own sequence, and that the gated report contains both samples' rows. In the second test, no sample has hits. The identifier files for the cleaned and paired collections are zero bytes, and a marker step gated on the negated boolean runs, which shows the gate came out false. `planemo test` passes both cases against Galaxy `release_26.1`.

The fixture does not cover Filter Failed, because a Planemo workflow test fails whenever the history holds an errored dataset. The linked-pairing rule is read from `walk_collections` and `compatible_shape` in Galaxy's `lib/galaxy/model/dataset_collections/structure.py`.

## See also

- [[collection-cleanup-after-mapover-failure]]—which filter to use, and the `replacement` limits.
- [[sync-collections-by-identifier]]—identifier files, `__FILTER_FROM_FILE__` order, and relabeling.
- [[harmonize-by-sortlist-from-identifiers]]—reorder a sibling when order must match.
- [[conditional-gate-on-nonempty-result]]—the collection-to-boolean chain.
- [[iwc-map-over-lifecycle-survey]]—Shape B, the corpus evidence for this recipe.
- [[galaxy-conditionals-patterns]]—the conditional operation map.
