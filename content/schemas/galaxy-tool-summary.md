---
type: schema
name: galaxy-tool-summary
title: Galaxy tool summary manifest
package: "@galaxy-foundry/foundry"
package_export: "galaxyToolSummarySchema"
validator_bin: foundry
validator_subcommand: validate-galaxy-tool-summary
upstream: "https://github.com/jmchilton/foundry/blob/main/packages/foundry/src/schemas/galaxy-tool-summary/galaxy-tool-summary.schema.json"
tags:
  - schema
  - target/galaxy
status: draft
created: 2026-05-05
revised: 2026-05-05
revision: 1
ai_generated: true
related_notes:
  - "[[galaxy-tool-summary-input-source]]"
related_molds:
  - "[[summarize-galaxy-tool]]"
  - "[[implement-galaxy-tool-step]]"
  - "[[author-galaxy-tool-wrapper]]"
summary: "JSON Schema for the deterministic per-tool manifest emitted by `galaxy-tool-cache summarize`."
---

This page is auto-rendered from the JSON Schema authored in this repo. Each `$def` becomes a section below with a stable anchor ID — research notes and Mold bodies can deep-link individual shapes via `[[galaxy-tool-summary#SourceRecord]]`.

**Source-of-truth chain:**

1. `packages/foundry/src/schemas/galaxy-tool-summary/galaxy-tool-summary.schema.json` — the canonical JSON, hand-edited alongside the Mold/cast loop around [[summarize-galaxy-tool]]. Mold frontmatter still cites it as `content/schemas/galaxy-tool-summary.schema.json`; cast and Astro resolve that back to the package source.
2. `packages/foundry/scripts/sync-schema.mjs` runs at `prebuild`, regenerating the typed `galaxy-tool-summary.schema.generated.ts` const wrapper from the canonical JSON.
3. Published as part of `@galaxy-foundry/foundry` (orphan schema bundled in the unified CLI). Site rendering imports the schema directly from this package via `site/src/lib/schema-registry.ts`; the published CLI also ships `foundry validate-galaxy-tool-summary` for cast skills and downstream consumers.

**At runtime in cast skills:** validation should happen through the CLI command:

```sh
foundry validate-galaxy-tool-summary manifest.json
```

Library validation exists for TypeScript consumers, but generated skills should prefer command-shaped validation so failures are easy to reproduce outside the agent runtime.

## Why manifest-shaped

This schema describes the deterministic JSON emitted by `galaxy-tool-cache summarize <tool_id> --version <ver>` from [`@galaxy-tool-util/cli@1.3.x`](https://www.npmjs.com/package/@galaxy-tool-util/cli) — not a curated Foundry-flavored summary. The CLI handles the deterministic, side-effect-bearing work (cache lookup, source classification, `effect/JSONSchema` translation of the parameter bundle); the manifest is the contract Foundry consumers bind to.

The shape:

- **`source`** — where the cache entry came from (`toolshed`, `galaxy`, `local`, `orphan`, `unknown`), with the raw cache-index `label`, origin URL, and cached-at timestamp.
- **`artifacts`** — filesystem paths to `<cache_key>.json` and (later) `<cache_key>.source` so consumers can reload or pass-through the raw bytes. Local debugging only; not stable across machines. `raw_tool_source_path` is `null` until [galaxy-tool-util-ts#82](https://github.com/jmchilton/galaxy-tool-util-ts/issues/82) ships the raw-source storage path.
- **`parsed_tool`** — upstream `ParsedTool` payload, owned by `@galaxy-tool-util/schema`. Validated against `parsedToolSchema`; see [[parsed-tool]] for the inner shape. The Foundry schema does not duplicate this model.
- **`input_schemas`** — generated JSON Schemas for the `workflow_step` and `workflow_step_linked` representations, suitable for direct binding by `[[implement-galaxy-tool-step]]`. Either entry is `null` when generation fails, in which case `warnings[]` carries the reason.

## Scope and v2 follow-ups

v1 mirrors what `galaxy-tool-cache summarize` actually emits today. It does **not** attempt to surface curated requirements, containers, command, or stdio — those fields are not yet on upstream `ParsedTool` and remain out of scope until Galaxy upstream lands them and `@galaxy-tool-util/schema` mirrors them. Track:

- [galaxy-tool-util-ts#82](https://github.com/jmchilton/galaxy-tool-util-ts/issues/82) — raw `<cache_key>.source` storage; flips `artifacts.raw_tool_source_path` from always-null to optionally populated.
- Galaxy upstream ParsedTool extension (requirements, containers, stdio) — once it lands and is mirrored in `@galaxy-tool-util/schema`, the `parsed_tool` subtree gains those fields automatically because this schema delegates to upstream `parsedToolSchema`.

A v2 of this manifest can layer Foundry-curated fields on top of (not in place of) the upstream `parsed_tool`, bumping `schema_version` to 2. Downstream Molds should branch on the integer to stay compatible during the transition.
