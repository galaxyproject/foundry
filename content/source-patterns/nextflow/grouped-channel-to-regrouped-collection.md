---
type: source-pattern
title: "Nextflow: grouped channel to regrouped Galaxy collection"
source: nextflow
target: galaxy
source_pattern_kind: operator
implemented_by_patterns:
  - "[[reshape-relabel-remap-by-collection-axis]]"
  - "[[collection-swap-nesting-with-apply-rules]]"
  - "[[collection-split-identifier-via-rules]]"
  - "[[collection-flatten-after-fanout]]"
  - "[[collection-unbox-singleton]]"
review_triggers:
  - "groupTuple uses explicit size, sort, or groupKey behavior."
  - "transpose changes payload arity or relies on arbitrary tuple-record structure."
  - "Group key is not a real Galaxy collection axis."
  - "Grouped payload contains heterogeneous files with no shared collection element type."
  - "Downstream logic depends on tuple field order rather than named identifiers."
  - "Flattening would discard a grouping axis needed downstream."
tags:
  - source/nextflow
  - target/galaxy
status: draft
created: 2026-05-04
revised: 2026-05-04
revision: 1
ai_generated: true
related_notes:
  - "[[nextflow-patterns]]"
summary: "Route Nextflow groupTuple, transpose, and grouped tuple payloads to Galaxy collection reshape patterns when the key is a real axis."
---

# Nextflow: grouped channel to regrouped Galaxy collection

Use this when Nextflow groups records with `groupTuple()`, reshapes grouped records with `transpose()`, or passes grouped tuple payloads that must become Galaxy collection structure.

## Source signal

- `groupTuple()` gathers records by key.
- `transpose()` can expand or rotate grouped tuple payloads.
- Grouped payloads often look collection-like, but Galaxy collections are typed axes, not arbitrary tuple records.

## Translation rule

First decide whether the grouping key is a real Galaxy axis such as sample, region, segment, replicate, or method.

- If yes, model it as `list`, `list:list`, `list:paired`, or another concrete collection shape.
- If the axis order is wrong, use [[collection-swap-nesting-with-apply-rules]] or [[reshape-relabel-remap-by-collection-axis]].
- If one identifier encodes multiple axes, use [[collection-split-identifier-via-rules]].
- If the outer axis no longer matters, use [[collection-flatten-after-fanout]].
- If the grouped result is a known singleton, use [[collection-unbox-singleton]].
- If grouping only feeds a domain merge/reduce tool, implement the reducer rather than a synthetic reshape.

## Decision checklist

1. Name the group key.
2. Name the grouped payload fields.
3. Identify the Galaxy mapped axis needed by the next tool.
4. Choose preserve, swap, split, flatten, unbox, or reduce.
5. Add review if tuple shape is arbitrary or lossy.

## Evidence posture

This page is grounded in existing Foundry notes that map `groupTuple()` and `transpose()` to collection reshape decisions. Direct fixture evidence was not regenerated during authoring.
