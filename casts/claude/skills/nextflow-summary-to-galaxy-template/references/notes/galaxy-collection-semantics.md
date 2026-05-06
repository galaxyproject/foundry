---
type: research
subtype: component
title: "Galaxy collection semantics"
tags:
  - research/component
  - target/galaxy
status: draft
created: 2026-04-30
revised: 2026-05-05
revision: 3
ai_generated: false
related_notes:
  - "[[galaxy-xsd]]"
  - "[[galaxy-collection-tools]]"
  - "[[galaxy-apply-rules-dsl]]"
  - "[[nextflow-to-galaxy-channel-shape-mapping]]"
  - "[[nextflow-operators-to-galaxy-collection-recipes]]"
  - "[[galaxy-tool-job-failure-reference]]"
  - "[[galaxy-workflow-invocation-failure-reference]]"
  - "[[iwc-transformations-survey]]"
sources:
  - "https://github.com/galaxyproject/galaxy/blob/7765fae934fbfdee77e3be5f5b235e43735273ae/lib/galaxy/model/dataset_collections/types/collection_semantics.yml"
summary: "Vendored formal spec of Galaxy dataset-collection mapping/reduction semantics, with labeled examples and pinned test references."
---

> **Vendored from upstream**, pinned at SHA `7765fae`. Two files live next to this note:
>
> - `galaxy-collection-semantics.yml` — the structured source. **Agents and casting should consume this.** It carries the `tests:` blocks that pin concrete Galaxy test names; the rendered upstream view drops them.
> - `galaxy-collection-semantics.upstream.myst` — Galaxy's auto-generated MyST/LaTeX rendering of the YAML, vendored only so the human view below has something to render. Sync is manual.
>
> **When to consult:** authoring or reasoning about Molds and patterns that touch `data_collection` inputs, map-over / reduction shape changes, sub-collection mapping, `paired_or_unpaired`, or `sample_sheet`.

```vendored-myst
file: galaxy-collection-semantics.upstream.myst
source: https://github.com/galaxyproject/galaxy/blob/7765fae934fbfdee77e3be5f5b235e43735273ae/doc/source/dev/collection_semantics.md
sha: 7765fae
```
