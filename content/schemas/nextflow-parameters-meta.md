---
type: schema
name: nextflow-parameters-meta
title: Nextflow parameter schema (nf-schema meta-schema)
package: "@galaxy-foundry/summarize-nextflow"
package_export: "nextflowParametersMetaSchema"
upstream: "https://github.com/nextflow-io/nf-schema/blob/bde406e81a4ac614650d73df6df6dcf793182929/parameters_meta_schema.json"
license: Apache-2.0
license_file: LICENSES/nf-schema.LICENSE
tags:
  - schema
  - source/nextflow
status: draft
created: 2026-05-05
revised: 2026-05-05
revision: 1
ai_generated: true
related_notes:
  - "[[summarize-nextflow]]"
  - "[[nextflow-workflow-io-semantics]]"
  - "[[component-nextflow-pipeline-anatomy]]"
  - "[[component-nf-core-tools]]"
related_molds:
  - "[[summarize-nextflow]]"
summary: "JSON Schema (Draft 2020-12) meta-schema validating per-pipeline nextflow_schema.json files. Upstream from nextflow-io/nf-schema."
---

JSON Schema (**Draft 2020-12**) vendored verbatim from `nextflow-io/nf-schema` at SHA `bde406e`. Validates every pipeline's `nextflow_schema.json` — the parameter-surface contract consumed by the runtime `nf-schema` plugin, the nf-co.re schema builder, `nf-core launch`, and Seqera Platform.

**Operational role.** This is the meta-schema referenced by `summarize-nextflow` §3: "When `nextflow_schema.json` exists (nf-core), prefer it as the source of truth for `type`, `description`, and `required` — it is real JSON Schema, copy verbatim." This schema pins exactly which JSON Schema subset and which nf-core extensions are legal, so the cast skill emitting `summary-nextflow.schema.json`'s `params[]` block can validate its source rather than guess.

**Draft-version note.** This is the only Foundry-vendored schema currently authored against JSON Schema Draft 2020-12 (others are Draft-07). Validators consuming this schema must be Draft-2020-12-capable; AJV needs `import Ajv from "ajv/dist/2020.js"` rather than the default Draft-07 import. The Foundry's own validator (`scripts/validate.ts`) only validates Foundry frontmatter (Draft-07) and does not load this schema as a meta — there's no impedance.

**Source-of-truth chain:**

1. `parameters_meta_schema.json` in [`nextflow-io/nf-schema`](https://github.com/nextflow-io/nf-schema).
2. Vendored verbatim into `content/schemas/nextflow-parameters-meta.schema.json`, pinned at `upstream`'s SHA.
3. **Re-sync:** `curl -sL https://raw.githubusercontent.com/nextflow-io/nf-schema/<sha>/parameters_meta_schema.json -o content/schemas/nextflow-parameters-meta.schema.json` and bump the SHA.

## Top-level shape

A valid `nextflow_schema.json` is an object with required keys `$schema`, `$id`, `title`, `description`, `type` (constrained to `object`). Optional: `$defs` (parameter groups, the canonical nf-core idiom), `allOf` (composes the groups).

Each parameter property must declare `type` ∈ `[string, boolean, integer, number]` — **narrower than vanilla JSON Schema**; arrays and objects are deliberately disallowed at the top level (the `samplesheetToList` plugin handles tabular data outside the parameter schema). Optional keywords:

- `format` ∈ `[file-path, directory-path, path, file-path-pattern]` — semantic enrichment for path-shaped params.
- `exists` (boolean) — runtime existence check.
- `mimetype` (`.+/.+`) — sniffed at validation time.
- `pattern`, `schema` — string constraints; `schema` references a sample-sheet sub-schema.
- `description`, `help_text`, `errorMessage`, `fa_icon` (`^fa…`), `hidden`.
- `minLength`, `maxLength`, `minimum`, `maximum` — integers.

Parameter groups under `$defs` themselves require `title`, `type` (`object`), `properties`. Optional `description`, `fa_icon`, `required` — the same enrichment vocabulary.

## Upstream license

Apache-2.0. See `LICENSES/nf-schema.LICENSE`.
