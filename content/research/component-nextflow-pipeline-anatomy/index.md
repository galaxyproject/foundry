---
type: research
tags:
  - source/nextflow
component: "Nextflow Pipeline Anatomy (DSL2)"
status: draft
created: 2026-05-01
revised: 2026-11-10
revision: 3
related_notes:
  - "[[nextflow-workflow-io-semantics]]"
  - "[[iwc-map-over-lifecycle-survey]]"
  - "[[iwc-parameter-derivation-survey]]"
summary: "Stub. DSL2 layout, channel idioms, operator-chain reading rules. Grows from cast contact with rnaseq/sarek/ad-hoc — see issue #17."
related_molds:
  - "[[summarize-nextflow]]"
---

# Nextflow Pipeline Anatomy (DSL2)

Stub. Grown from cast contact, not pre-emptively (see issue #17).

## Primary sources

- Nextflow DSL2 docs: https://www.nextflow.io/docs/latest/dsl2.html
- nf-core pipeline structure: https://nf-co.re/docs/contributing/pipelines
- nf-core module spec: https://nf-co.re/docs/contributing/modules

## Directives outside the process body

nf-core pipelines keep publication paths and command-line arguments out of the `process` body. The root `nextflow.config` pulls them in with `includeConfig`, often through a workflow config into per-module `nextflow.config` files or `conf/modules/`. Each assignment sits in a `withName:` or `withLabel:` selector. A selector may be a plain process name, a regular expression, or a subworkflow-qualified path such as `NFCORE_RNASEQ:RNASEQ:FASTQC`. Closures stay as written, because evaluating them would hide which `params` and `meta` fields they read. A `profiles { }` block is separate from that chain. `includeConfig` and selectors inside it apply only when that profile is selected, and [[summarize-nextflow]] records the profile name on those entries. A script block that is only `template 'file'` points at `templates/<file>` next to the module. The Mold copies the three into `publish_dir`, `resolved_args`, and `template`.

## Open gaps

_Paragraphs land here when the runtime cast hits a pipeline shape SKILL.md does not cover. Each entry names the motivating target._
