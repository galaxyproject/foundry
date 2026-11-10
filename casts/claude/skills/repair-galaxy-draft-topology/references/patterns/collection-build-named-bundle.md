---
type: pattern
pattern_kind: operation
evidence: corpus-and-verified
title: "Collection: build named bundle"
aliases:
  - "collection build list named outputs"
  - "__BUILD_LIST__ named bundle"
  - "tool-output fan-in collection"
tags:
  - target/galaxy
  - topic/galaxy-transform
  - topic/collection-transform
status: draft
created: 2026-05-02
revised: 2026-09-14
revision: 3
summary: "Use BUILD_LIST to assemble named outputs into a collection bundle for publishing or downstream fan-in."
related_notes:
  - "[[iwc-transformations-survey]]"
  - "[[galaxy-apply-rules-dsl]]"
related_patterns:
  - "[[collection-flatten-after-fanout]]"
  - "[[tabular-concatenate-collection-to-table]]"
related_molds:
  - "[[implement-galaxy-tool-step]]"
verification_paths:
  - verification/workflows/collection-build-named-bundle/build-named-bundle.gxwf-test.yml
iwc_exemplars:
  - workflow: amplicon/qiime2/qiime2-III-VI-downsteam/QIIME2-VI-diversity-metrics-and-estimations
    why: "Groups QIIME2 plots, PCoA results, distance matrices, and richness vectors into named output collections."
    confidence: high
  - workflow: microbiome/mags-building/MAGs-generation
    why: "Assembles bin-table outputs from multiple binners into one collection for binette."
    confidence: high
---

# Collection: build named bundle

## Tool

Use Galaxy built-in `__BUILD_LIST__`.

The survey found two useful sub-cases:

- Manual-id output bundle: collect related outputs into a named result collection for organization or publishing.
- Identifier-id fan-in: assemble tool outputs into one collection for a downstream tool that expects collection input.

`__MERGE_COLLECTION__` is the sibling operation when the inputs are already collections. Current corpus evidence does not justify a standalone merge pattern.

## When to reach for it

Use `__BUILD_LIST__` when you start with individual datasets or individual output connections and need a Galaxy `list`.

Use manual identifiers when element names should be human-authored result labels. Use inherited identifiers when downstream semantics already know those names.

Do not use this to concatenate file contents. Use [[tabular-concatenate-collection-to-table]] when the goal is one combined tabular dataset.

## Parameters

`datasets` is a repeat. Each entry pairs the connected `input` with an `id_cond` naming where that element's identifier comes from:

```yaml
tool_id: __BUILD_LIST__
tool_state:
  datasets:
    - input: { __class__: ConnectedValue }
      id_cond:
        id_select: manual
        identifier: bray_curtis_pcoa_results
```

Connect slot N through `datasets_N|input`.

- `id_select: manual`: human-authored names for output bundles. Carries an `identifier` sub-field.
- `id_select: identifier`: inherit the source element identifier, falling back to the dataset name. `__EXTRACT_DATASET__` renames its output after the element it pulled, so identifiers survive that hop.
- `id_select: idx`: the repeat index, numbered from `0`. The default; avoid when element identity matters.

## Pitfalls

- Manual identifiers become collection element identifiers and may appear in output histories or reports.
- Two entries sharing one identifier collapse to a single element holding the later dataset. Identifiers are dictionary keys — no duplicate, no error.
- Manual bundles group outputs; they do not align rows, merge contents, or validate common keys.
- Use inherited identifiers only when source names are meaningful.
- Prefer `__MERGE_COLLECTION__` only when inputs are already collections.

## See also

- [[iwc-transformations-survey]] — Recipe K and candidate boundary.
- [[collection-flatten-after-fanout]] — collapse nested outputs before downstream pooling.
- [[tabular-concatenate-collection-to-table]] — row-bind a collection of tabulars after collection assembly.
