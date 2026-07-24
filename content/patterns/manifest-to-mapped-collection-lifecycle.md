---
type: pattern
pattern_kind: recipe
evidence: corpus-observed
title: "Manifest to mapped collection lifecycle"
aliases:
  - "manifest table to mapped collection"
  - "samplesheet to Galaxy map-over"
  - "table rows to mapped collection outputs"
tags:
  - target/galaxy
  - topic/galaxy-transform
  - topic/collection-transform
status: draft
created: 2026-05-04
revised: 2026-05-04
revision: 1
ai_generated: true
summary: "Use a manifest or table to build a collection, map a tool per row, then relabel or reshape outputs."
related_notes:
  - "[[iwc-map-over-lifecycle-survey]]"
  - "[[nextflow-to-galaxy-channel-shape-mapping]]"
  - "[[iwc-tabular-operations-survey]]"
related_patterns:
  - "[[tabular-to-collection-by-row]]"
  - "[[collection-build-list-paired-with-apply-rules]]"
  - "[[regex-relabel-via-tabular]]"
  - "[[harmonize-by-sortlist-from-identifiers]]"
  - "[[collection-swap-nesting-with-apply-rules]]"
  - "[[collection-flatten-after-fanout]]"
  - "[[collection-unbox-singleton]]"
related_molds:
  - "[[implement-galaxy-tool-step]]"
  - "[[nextflow-summary-to-galaxy-data-flow]]"
  - "[[cwl-summary-to-galaxy-data-flow]]"
iwc_exemplars:
  - workflow: data-fetching/sra-manifest-to-concatenated-fastqs/sra-manifest-to-concatenated-fastqs
    why: "Splits a manifest to accessions, maps fasterq_dump, then relabels and reshapes paired/single outputs."
    confidence: high
  - workflow: virology/pox-virus-amplicon/pox-virus-half-genome
    why: "Derives sibling collections from table structure before mapped paired processing."
    confidence: medium
---

# Manifest to mapped collection lifecycle

Use this recipe when a source manifest, samplesheet, or tabular list describes repeated work and Galaxy should run one domain tool invocation per row or key.

The reusable value is the handoff from tabular structure into collection map-over, then from mapped outputs back into stable labels or downstream collection shapes.

## Recipe

1. Normalize the manifest to the columns that define one unit of work.
2. Build a Galaxy collection from those rows or from Apply Rules-derived identifiers.
3. Connect the collection to the domain tool input so Galaxy maps the tool over elements.
4. Relabel mapped outputs when the tool emits generic or source-derived names, or harmonize sibling collections when paired map-over depends on shared identifiers/order.
5. Reshape, flatten, or unbox paired, nested, or singleton outputs before publication or downstream map-over.

## Reach For This When

- A Nextflow samplesheet or `tuple(meta, path)` stream is being translated into repeated Galaxy collection elements.
- A paper protocol says "run this step for each accession/sample/amplicon/region" and the repeated unit is represented in a table.
- The output collection needs stable sample labels rather than tool-generated names.

## Operation Handoffs

- Use [[tabular-to-collection-by-row]] when one manifest row becomes one collection element.
- Use [[collection-build-list-paired-with-apply-rules]] when manifest columns encode paired inputs.
- Use [[regex-relabel-via-tabular]] when mapped outputs need deterministic label cleanup.
- Use [[harmonize-by-sortlist-from-identifiers]] when sibling collections from the manifest must align before paired map-over.
- Use [[collection-flatten-after-fanout]] when later nested outputs need pooled downstream processing.
- Use [[collection-swap-nesting-with-apply-rules]] or [[collection-unbox-singleton]] when the mapped output shape is not the shape the next step expects.

## Pitfalls

- Do not preserve manifest columns blindly. Keep the columns that define collection identity, pairing, or downstream parameters.
- Do not let tool defaults choose output element identifiers when tests or sibling sync will need stable names.
- Do not use this recipe for simple file-content concatenation or report reduction; use the relevant aggregation operation after map-over.

## See Also

- [[iwc-map-over-lifecycle-survey]] — Shape A and Nextflow samplesheet mapping evidence.
- [[galaxy-collection-patterns]] — collection operation map.
