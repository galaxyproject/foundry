---
type: schema
name: parsed-tool
title: Galaxy ParsedTool
package: "@galaxy-tool-util/schema"
package_export: "parsedToolSchema"
upstream: "https://github.com/jmchilton/galaxy-tool-util-ts/blob/main/packages/schema/src/schema/parsed-tool.ts"
license: MIT
license_file: LICENSES/galaxy-tool-util-ts.LICENSE
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
summary: "JSON Schema for the upstream Galaxy `ParsedTool` model, vendored from `@galaxy-tool-util/schema`."
---

This page is auto-rendered from the JSON Schema vendored in `@galaxy-tool-util/schema`'s `parsedToolSchema` export. The Foundry does **not** maintain a separate copy — `[[galaxy-tool-summary]]` references this schema from its `parsed_tool` property at validator-construction time, and any Mold that needs to deep-link a parsed-tool field can use `[[parsed-tool#FIELD]]` rather than duplicating the model.

**Source-of-truth chain:**

1. `lib/galaxy/tool_util/parser/yaml.py` and the `ParsedTool` Effect schema in `packages/schema/src/schema/parsed-tool.ts` of [jmchilton/galaxy-tool-util-ts](https://github.com/jmchilton/galaxy-tool-util-ts) — track upstream Galaxy's typed tool-source model.
2. `parsedToolSchema = JSONSchema.make(ParsedTool, { target: "jsonSchema2020-12" })` exports the JSON Schema form alongside the Effect type.
3. Published as `@galaxy-tool-util/schema` on npm; the Foundry pins a version in `packages/foundry/package.json` and consumes the export both for site rendering (via `site/src/lib/schema-registry.ts`) and for AJV validation of the `parsed_tool` subtree of a `[[galaxy-tool-summary]]` manifest.

## Foundry Coverage Today

Upstream `ParsedTool` currently models tool identity, typed inputs and outputs, citations, license, profile, EDAM mappings, xrefs, and help. It does **not** yet carry requirements, containers, or stdio — those land via a Galaxy upstream extension and a follow-up sync in `@galaxy-tool-util/schema`. `[[galaxy-tool-summary]]` is intentionally pinned to the live upstream surface; once requirements/containers/stdio mirror in, this page and `parsed_tool` validation pick them up automatically.

## Why vendor instead of duplicate

Duplicating the `ParsedTool` JSON Schema in Foundry would create two sources of truth and force Foundry to chase upstream every time the parse model evolves. Vendoring keeps Foundry's contract narrow: the Foundry's own schema (`[[galaxy-tool-summary]]`) describes the **manifest** Foundry emits — provenance, artifacts, generated input schemas — while the parsed wrapper itself is whatever upstream says it is.
