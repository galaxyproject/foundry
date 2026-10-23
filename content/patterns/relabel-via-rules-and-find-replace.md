---
type: pattern
pattern_kind: recipe
evidence: corpus-and-verified
title: "Collection: relabel via rules and find/replace"
aliases:
  - "collection relabel via rules and find replace"
  - "structured relabel via Apply Rules"
  - "influenza collection relabel fan-out"
  - "relabel inner identifiers of a list:list"
tags:
  - target/galaxy
  - topic/galaxy-transform
  - topic/collection-transform
status: draft
created: 2026-05-02
revised: 2026-10-22
revision: 3
summary: "Relabel the inner level of a list:list by swapping it to the top with Apply Rules, relabeling from a find/replace-built table, and swapping back."
related_notes:
  - "[[iwc-transformations-survey]]"
  - "[[galaxy-apply-rules-dsl]]"
  - "[[galaxy-collection-tools]]"
  - "[[nextflow-to-galaxy-channel-shape-mapping]]"
related_patterns:
  - "[[regex-relabel-via-tabular]]"
  - "[[collection-swap-nesting-with-apply-rules]]"
related_molds:
  - "[[implement-galaxy-tool-step]]"
verification_paths:
  - verification/workflows/relabel-via-rules-and-find-replace/relabel-via-rules-and-find-replace.gxwf-test.yml
iwc_exemplars:
  - workflow: virology/influenza-isolates-consensus-and-subtyping/influenza-consensus-and-subtyping
    steps:
      - id: 34
      - id: 35
      - id: 36
      - id: 37
      - id: 38
      - id: 39
    why: "bamtools_split_ref (step 32) yields a sample -> reference list:list whose inner identifiers read 'Final read mapping results: <segment>'. Step 34 swaps that level to the top, steps 35-37 build an old-to-new table from the outer identifiers, step 38 relabels in tabular mode, and step 39 swaps back to sample -> segment for ivar_consensus."
    confidence: high
---

# Collection: relabel via rules and find/replace

`__RELABEL_FROM_FILE__` renames only the top-level elements of a collection and copies everything beneath them unchanged. To clean the inner identifiers of a `list:list`, bring that level to the top with `__APPLY_RULES__`, relabel it from an `old<TAB>new` table, and swap back. The nesting ends where it started, and only the inner identifiers change.

The chain has five steps:

1. `__APPLY_RULES__` swaps `sample -> segment` to `segment -> sample`.
2. `collection_element_identifiers`, run twice, lists the outer identifiers of the swapped `list:list`.
3. `tp_find_and_replace` turns each identifier into an `old<TAB>new` row.
4. `__RELABEL_FROM_FILE__` in `tabular` mode renames the outer level.
5. `__APPLY_RULES__` swaps back to `sample -> segment`.

## When to reach for it

Use this when a mapped-over tool fans each sample out into a nested list whose inner identifiers carry tool-generated text, and downstream steps need the clean names. The only IWC instance is the influenza consensus workflow. `bamtools_split_ref` names each per-reference BAM `<input dataset name>: <reference>`, so after it maps over samples, each sample holds elements such as `Final read mapping results: HA`. The relabeled collection then feeds `ivar_consensus` as `sample -> segment`. Earlier in the same workflow, steps 14 and 15 use the same move without the swap back: they swap a broadcast `list:list` and relabel its new top level positionally with sample names.

Choose a neighbor when the job is different:

- [[regex-relabel-via-tabular]] when the identifiers to change are already at the top level. It owns the details of building the table and of `__RELABEL_FROM_FILE__` modes.
- [[collection-swap-nesting-with-apply-rules]] when the nesting must change and the identifiers are already clean.
- [[collection-split-identifier-via-rules]] when one flat identifier encodes two axes to split into nesting.

## Swap the noisy level to the top

These steps are excerpted from the verified workflow, where `mapped: HA` stands in for the influenza prefix. The swap is the rule set from [[collection-swap-nesting-with-apply-rules]]:

```yaml
- id: swap_to_segment
  tool_id: __APPLY_RULES__
  in:
    - id: input
      source: sample_by_segment
  out:
    - id: output
  tool_state:
    input:
      __class__: ConnectedValue
    rules:
      rules:
        - type: add_column_metadata
          value: identifier0
        - type: add_column_metadata
          value: identifier1
      mapping:
        - type: list_identifiers
          columns: [1, 0]
```

The swap groups rows by the inner identifier, so every sample must use the same noisy name for the same segment. The influenza workflow gets this by renaming each sample's `samtools_view` output to `Final read mapping results` (step 31) before `bamtools_split_ref` builds identifiers from that name. If the prefix varied by sample, say `sampleA.bam: HA` and `sampleB.bam: HA`, the swap would make one outer element per sample and segment. Relabeling them all to `HA` would then fail with `appears twice in resulting collection`.

## Build the table from the outer identifiers

`collection_element_identifiers` accepts a `list` or `list:paired`. Given the swapped `list:list`, Galaxy maps it over the outer level and returns a `list` of per-segment files, each naming the samples. A second `collection_element_identifiers` lists that list's identifiers, which are the segment names:

```yaml
- id: identifiers_per_segment
  tool_id: toolshed.g2.bx.psu.edu/repos/iuc/collection_element_identifiers/collection_element_identifiers/0.0.3
  in:
    - id: input_collection
      source: swap_to_segment/output
  out:
    - id: output
  tool_state:
    input_collection:
      __class__: ConnectedValue
- id: segment_identifiers
  tool_id: toolshed.g2.bx.psu.edu/repos/iuc/collection_element_identifiers/collection_element_identifiers/0.0.3
  in:
    - id: input_collection
      source: identifiers_per_segment/output
  out:
    - id: output
      change_datatype: tabular
  tool_state:
    input_collection:
      __class__: ConnectedValue
- id: build_mapping
  tool_id: toolshed.g2.bx.psu.edu/repos/bgruening/text_processing/tp_find_and_replace/9.5+galaxy3
  in:
    - id: infile
      source: segment_identifiers/output
  out:
    - id: outfile
  tool_state:
    infile:
      __class__: ConnectedValue
    find_and_replace:
      - find_pattern: '^(mapped: (.+))$'
        replace_pattern: '$1\t$2'
        is_regex: true
        global: false
        caseinsensitive: false
        wholewords: false
        skip_first_line: false
        searchwhere:
          searchwhere_select: line
```

`change_datatype: tabular` belongs on the second extraction. `tp_find_and_replace` takes its output datatype from that file, and the relabel tool's tabular modes accept only `tabular` labels. The influenza workflow sets it on both extractions. The regex keeps the whole identifier as column 1 and the segment as column 2, so the table reads:

```text
mapped: HA	HA
mapped: NA	NA
```

[[regex-relabel-via-tabular]] explains the `find_and_replace` repeat, Perl `$1` captures, and quoting `\t` in gxformat2.

## Relabel and swap back

```yaml
- id: relabel_segments
  tool_id: __RELABEL_FROM_FILE__
  in:
    - id: input
      source: swap_to_segment/output
    - id: how|labels
      source: build_mapping/outfile
  out:
    - id: output
  tool_state:
    input:
      __class__: ConnectedValue
    how:
      how_select: tabular
      labels:
        __class__: ConnectedValue
      strict: false
```

The relabel targets the swapped collection and renames its outer elements by name. Each renamed element keeps its inner `list` of samples. The influenza workflow leaves `strict` off. Because the table comes from this collection, every element has a row, and `strict: true` would also pass.

The last step, `swap_back`, repeats the `swap_to_segment` rules on the relabeled collection and restores `sample -> segment`.

## Check the result

With input `sampleA -> {mapped: HA, mapped: NA}` and `sampleB -> {mapped: HA, mapped: NA}`, the verified workflow produces:

- after the relabel, `HA -> {sampleA, sampleB}` and `NA -> {sampleA, sampleB}`.
- after the swap back, `sampleA -> {HA, NA}` and `sampleB -> {HA, NA}`, with each dataset under its original sample and segment.

The job fails, rather than producing a partial collection, when two outer elements map to the same new label or a new label contains a character outside `^[\w\- \.,]+$`, such as `:` or `/`. A regex that misses an identifier leaves a one-column row, which tabular mode rejects.

## One Apply Rules step instead

A single `__APPLY_RULES__` step can rewrite the inner identifiers in place. IWC does not use this form, and the verified workflow checks that it produces the same `list:list` as the five-step chain:

```yaml
- id: relabel_in_place
  tool_id: __APPLY_RULES__
  in:
    - id: input
      source: sample_by_segment
  out:
    - id: output
  tool_state:
    input:
      __class__: ConnectedValue
    rules:
      rules:
        - type: add_column_metadata
          value: identifier0
        - type: add_column_metadata
          value: identifier1
        - type: add_column_regex
          target_column: 1
          expression: '^mapped: (.+)$'
          replacement: '\1'
      mapping:
        - type: list_identifiers
          columns: [0, 2]
```

The regex runs per row, so it does not need a prefix shared across samples, and an identifier it does not match fails the job by default. It skips the checks the relabel tool makes, though. Apply Rules does not validate identifier characters, and when two rows of one sample produce the same inner identifier, the later dataset replaces the earlier one without an error. Use the five-step chain when a collision or an invalid label should stop the run. [[galaxy-apply-rules-dsl]] describes `add_column_regex` and its `replacement` template.

## Pitfalls

- Point the relabel at the swapped collection. On the original `sample -> segment` collection it can rename only the samples, and the segment table matches none of them.
- One `collection_element_identifiers` step on a `list:list` returns per-segment lists of samples, not the segment names. The second step produces the table's source.
- Without `change_datatype: tabular` on the second extraction, the table stays `txt` and does not fit the tabular modes' `labels` input.
- Keep the rewrite narrow enough that distinct segments keep distinct names.

## See also

- [[regex-relabel-via-tabular]] — building the table and `__RELABEL_FROM_FILE__` behavior for top-level identifiers.
- [[collection-swap-nesting-with-apply-rules]] — the swap on its own.
- [[galaxy-collection-tools]] — `__RELABEL_FROM_FILE__` parameter contract and validation rules.
- [[galaxy-apply-rules-dsl]] — rule and mapping grammar.
- [[iwc-transformations-survey]] — Recipe B and its boundary with Recipe G.
