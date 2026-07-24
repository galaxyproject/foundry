---
type: schema
name: nf-core-subworkflow-meta
title: nf-core subworkflow meta.yml schema
package: "@galaxy-foundry/summarize-nextflow"
package_export: "nfCoreSubworkflowMetaSchema"
upstream: "https://github.com/nf-core/modules/blob/d8529909206a06d9ec73703ea07a533a511bb786/subworkflows/yaml-schema.json"
license: MIT
license_file: LICENSES/nf-core-modules.LICENSE
tags:
  - source/nextflow
status: draft
created: 2026-05-05
revised: 2026-05-05
revision: 1
ai_generated: true
related_notes:
  - "[[nf-core-module-meta]]"
  - "[[summarize-nextflow]]"
  - "[[component-nextflow-pipeline-anatomy]]"
  - "[[component-nf-core-tools]]"
related_molds:
  - "[[summarize-nextflow]]"
summary: "JSON Schema (Draft-07) validating nf-core subworkflow meta.yml — channel IO, components dependencies, authors. Upstream from nf-core/modules."
---

JSON Schema vendored verbatim from `nf-core/modules` at SHA `d852990`. Validates every subworkflow `meta.yml` under `subworkflows/nf-core/<name>/`.

**Operational role.** Companion to [[nf-core-module-meta]] for the subworkflow tier. `summarize-nextflow` §6 distinguishes `kind: pipeline` vs `kind: utility` subworkflows; this schema's `components` field — the declared transitive module/subworkflow dependencies — is the structured signal that backs the call-graph extraction.

**Source-of-truth chain:**

1. `subworkflows/yaml-schema.json` in [`nf-core/modules`](https://github.com/nf-core/modules), cited by every subworkflow `meta.yml` via `# yaml-language-server: $schema=https://raw.githubusercontent.com/nf-core/modules/master/subworkflows/yaml-schema.json`.
2. Vendored verbatim into `content/schemas/nf-core-subworkflow-meta.schema.json`, pinned at `upstream`'s SHA.
3. **Re-sync:** identical recipe to [[nf-core-module-meta]].

## Top-level shape

Required: `name`, `description`, `keywords` (≥3), `authors`, `output`, `components`. Optional: `input`, `maintainers`.

Differences from the module schema:

- `components` (required, array of strings) — declares modules and subworkflows the subworkflow depends on. Resolves transitively at install time per `nf-core/tools` modules.json. The cast skill walks this to fill `Subworkflow.calls[]`.
- No `tools[]` block (tools are declared at the leaf module level).
- No `containers` block.
- `input` and `output` shapes use the same `channelElement` / `channelArray` grammar as the module schema, so the `summarize-nextflow` channel IO extractor handles both with the same code path.

## Upstream license

Same MIT redistribution as [[nf-core-module-meta]]. See `LICENSES/nf-core-modules.LICENSE`.
