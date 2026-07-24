---
type: pattern
pattern_kind: operation
evidence: corpus-observed
title: "Collection: regex relabel via tabular"
aliases:
  - "collection regex relabel via tabular"
  - "tp_find_and_replace to RELABEL_FROM_FILE"
  - "collection relabel from identifier table"
tags:
  - target/galaxy
  - topic/galaxy-transform
  - topic/collection-transform
status: draft
created: 2026-05-02
revised: 2026-05-03
revision: 2
ai_generated: true
summary: "Derive collection element identifiers in a tabular mapping, then apply them with RELABEL_FROM_FILE."
related_notes:
  - "[[iwc-transformations-survey]]"
  - "[[nextflow-to-galaxy-channel-shape-mapping]]"
related_patterns:
  - "[[relabel-via-rules-and-find-replace]]"
  - "[[sync-collections-by-identifier]]"
related_molds:
  - "[[implement-galaxy-tool-step]]"
iwc_exemplars:
  - workflow: data-fetching/sra-manifest-to-concatenated-fastqs/sra-manifest-to-concatenated-fastqs
    why: "Uses a generated relabel table to restore paired and unpaired fasterq_dump output collection labels."
    confidence: high
  - workflow: microbiome/metagenomic-raw-reads-amr-analysis/metagenomic-raw-reads-amr-analysis
    why: "Uses original read identifiers to relabel a downstream collection."
    confidence: high
  - workflow: virology/influenza-isolates-consensus-and-subtyping/influenza-consensus-and-subtyping
    why: "Shows the heavier sibling chain with identifier extraction and find/replace before relabeling."
    confidence: high
---

# Collection: regex relabel via tabular

## Tool

Use a tabular mapping source, optionally transform it with `tp_find_and_replace`, then relabel the collection with `__RELABEL_FROM_FILE__`.

Corpus-shaped chain:

1. `collection_element_identifiers` or another mapping source emits identifiers as data.
2. `tp_find_and_replace` rewrites identifier text.
3. `__RELABEL_FROM_FILE__` applies the modified labels to the target collection.

## When to reach for it

Use this when the collection structure is right but element identifiers are wrong, noisy, or need a simple regex/string transformation.

Good fits include tool output that lost original sample names, identifiers that need prefix/suffix cleanup, and paired/unpaired outputs that need the same manifest-derived names.

Do not use this when relabeling is coupled to a structural reshape. Use [[relabel-via-rules-and-find-replace]] for the influenza-style restructure, extract identifiers, regex-relabel, restructure again shape.

This page is about label rewrite. Use [[sync-collections-by-identifier]] for membership sync and [[harmonize-by-sortlist-from-identifiers]] for order harmonization.

## Parameters

`collection_element_identifiers` emits one identifier per line and no header.

For `tp_find_and_replace`, set regex mode deliberately. For no-header identifier lists, do not skip the first line.

For `__RELABEL_FROM_FILE__`, choose line-based labels only when row order matches collection order. Use tabular old-to-new mapping when order is uncertain.

## Idiomatic shape

```yaml
# collection_element_identifiers(input collection)
# -> optional tp_find_and_replace
# -> __RELABEL_FROM_FILE__(target collection, labels=modified identifiers)
```

Regex cleanup before relabel:

```yaml
tool_id: toolshed.g2.bx.psu.edu/repos/bgruening/text_processing/tp_find_and_replace/9.5+galaxy3
tool_state:
  infile: { __class__: ConnectedValue }
  find_pattern: "^(.*)\\.fastq(\\.gz)?$"
  replace_pattern: "\\1"
  is_regex: true
  skip_first_line: false
```

## Pitfalls

- Line-based relabeling assumes mapping rows match collection element order.
- `collection_element_identifiers` has no header; skipping the first line drops a real identifier.
- Relabeling does not reorder or filter. Use a filter or sort pattern when membership or order changes.
- Keep regex cleanup narrow enough that distinct elements do not collapse to the same identifier.

## See also

- [[iwc-transformations-survey]] — Recipe G and candidate boundary.
- [[relabel-via-rules-and-find-replace]] — use when relabeling is fused with Apply Rules structural fan-out.
- [[sync-collections-by-identifier]] — use when identifiers filter or relabel sibling collections without regex cleanup.
