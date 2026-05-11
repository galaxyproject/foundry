---
type: schema
name: nf-core-module-meta
title: nf-core module meta.yml schema
package: "@galaxy-foundry/summarize-nextflow"
package_export: "nfCoreModuleMetaSchema"
upstream: "https://github.com/nf-core/modules/blob/d8529909206a06d9ec73703ea07a533a511bb786/modules/meta-schema.json"
license: MIT
license_file: LICENSES/nf-core-modules.LICENSE
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
  - "[[nf-core-subworkflow-meta]]"
  - "[[component-nextflow-pipeline-anatomy]]"
  - "[[component-nf-core-tools]]"
  - "[[component-nextflow-containers-and-envs]]"
related_molds:
  - "[[summarize-nextflow]]"
  - "[[author-galaxy-tool-wrapper]]"
summary: "JSON Schema (Draft-07) validating nf-core module meta.yml — channel IO, tools, containers, conda lockfiles. Upstream from nf-core/modules."
---

JSON Schema vendored verbatim from `nf-core/modules` at SHA `d852990`. Validates every `meta.yml` under `modules/nf-core/<tool>/<subtool>/`.

**Operational role.** This is the IO ground truth for `summarize-nextflow` §4. The Mold body says "Where `meta.yml` exists, **use it** for `description` and IO documentation rather than parsing the `script:` block" — this schema is the contract that says what fields are mandatory, what shapes they take, and what `type` enum the LLM extracting `processes[].inputs[].shape` is allowed to emit.

**Source-of-truth chain:**

1. `modules/meta-schema.json` in [`nf-core/modules`](https://github.com/nf-core/modules) — authored alongside the module library and cited by every `meta.yml` via `# yaml-language-server: $schema=https://raw.githubusercontent.com/nf-core/modules/master/modules/meta-schema.json`.
2. Vendored verbatim into `content/schemas/nf-core-module-meta.schema.json` here, pinned at the SHA in `upstream`.
3. **Re-sync:** re-run `curl -sL https://raw.githubusercontent.com/nf-core/modules/<sha>/modules/meta-schema.json -o content/schemas/nf-core-module-meta.schema.json` and bump the SHA in this note's `upstream` field.

**At cast time** (per `docs/COMPILATION_PIPELINE.md`): copied verbatim into the cast bundle's `references/schemas/`. Cast skills resolving an nf-core module's `meta.yml` validate against this contract before consuming the IO descriptions.

## Top-level shape

The schema's required keys are `name`, `description`, `keywords` (≥3, no `example`), `authors`, `output`, `tools`. Optional but commonly present: `input`, `extra_args`, `topics`, `maintainers`, `containers`.

The most important sub-shapes for downstream Molds:

- **`elementProperties.type`** — enum `[map, file, directory, string, integer, float, boolean, list, eval]`. This is the canonical set the cast skill must coerce into `summary-nextflow.schema.json`'s `ChannelIO.shape` strings.
- **`channelArray`** — list of `channelElement` or list-of-list (the recent flat-vs-nested change the [2025-meta.yml blog post](https://nf-co.re/blog/2025/modules-meta-yml) introduced: tuple channels are nested arrays, single-element channels are flat).
- **`tools[]`** — each tool block requires `description` and at least one of `homepage` / `documentation` / `tool_dev_url` / `doi`. `licence` is an array of SPDX identifiers. `identifier` is a `bio.tools` ID (pattern `^(biotools:.*)?$`).
- **`containers.docker` / `.singularity` / `.conda`** — the schema explicitly allows `^oras://.*$` for the singularity branch (legal ORAS pull form documented in [[component-nextflow-containers-and-envs]]).

## Upstream license

This schema is redistributed under `nf-core/modules`'s MIT license. See `LICENSES/nf-core-modules.LICENSE`.
