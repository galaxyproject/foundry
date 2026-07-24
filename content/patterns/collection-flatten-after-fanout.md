---
type: pattern
pattern_kind: operation
evidence: corpus-observed
title: "Collection: flatten after fan-out"
aliases:
  - "collection flatten after fanout"
  - "flatten list:list to list"
  - "__FLATTEN__ after fanout"
tags:
  - target/galaxy
  - topic/galaxy-transform
  - topic/collection-transform
status: draft
created: 2026-05-02
revised: 2026-05-03
revision: 2
ai_generated: true
summary: "Use FLATTEN to collapse nested collection outputs to a flat list once the outer axis no longer matters."
related_notes:
  - "[[iwc-transformations-survey]]"
  - "[[galaxy-apply-rules-dsl]]"
related_patterns:
  - "[[collection-build-named-bundle]]"
  - "[[harmonize-by-sortlist-from-identifiers]]"
related_molds:
  - "[[implement-galaxy-tool-step]]"
iwc_exemplars:
  - workflow: microbiome/mags-building/MAGs-generation
    why: "Flattens a list:list of bins from all samples for pool-level processing."
    confidence: high
  - workflow: transcriptomics/rnaseq-pe/rnaseq-pe
    why: "Flattens a paired collection to a flat list for MultiQC."
    confidence: high
  - workflow: microbiome/metagenomic-raw-reads-amr-analysis/metagenomic-raw-reads-amr-analysis
    why: "Flattens list:list output from sylph_profile before relabeling."
    confidence: high
---

# Collection: flatten after fan-out

## Tool

Use Galaxy built-in `__FLATTEN__`.

The corpus-attested operation is simple: collapse a nested collection such as `list:list` or `list:paired` into a flat `list` when the outer grouping axis has served its purpose.

## When to reach for it

Use this after a tool fans out within each sample/group and downstream no longer needs that grouping.

Typical shape: a domain tool maps over a collection and produces nested outputs, the outer axis becomes only organizational, and `__FLATTEN__` produces one flat list for pooling, relabeling, reporting, or MultiQC-style consumption.

Do not flatten if downstream needs to know which outer sample/group produced each element.

## Parameters

```yaml
tool_id: __FLATTEN__
tool_state:
  input: { __class__: ConnectedValue }
```

The useful authoring decision is input collection type and whether the outer axis is truly no longer meaningful.

## Pitfalls

- Flattening discards structure. Element identifiers may retain hints, but the Galaxy collection type no longer encodes the outer axis.
- Flatten only after the outer axis is done.
- If flattened identifiers collide or become unreadable, add an explicit relabel step.
- Do not use Apply Rules for plain flattening; the survey found `__FLATTEN__` dominates simple cases.

## See also

- [[iwc-transformations-survey]] — Recipe H and candidate boundary.
- [[collection-build-named-bundle]] — assemble named outputs into a collection.
- [[harmonize-by-sortlist-from-identifiers]] — order/intersect sibling collections by identifier file.
