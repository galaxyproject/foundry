---
type: research
title: "Galaxy native workflow (.ga) structural JSON Schema"
tags:
  - target/galaxy
status: draft
created: 2026-05-05
revised: 2026-05-05
revision: 1
ai_generated: true
related_notes:
  - "[[gxformat2-schema]]"
  - "[[galaxy-collection-semantics]]"
  - "[[galaxy-datatypes-conf]]"
sources:
  - "https://github.com/jmchilton/galaxy-tool-util-ts/blob/7ae4ecd0ba8d492225f58a6d455c4cc5317298f0/packages/schema/src/native-galaxy-workflow.ts"
summary: "Vendored structural JSON Schema for Galaxy native workflow (.ga) format: vocabulary for the JSON shape Galaxy emits and consumes."
---

> **Vendored from upstream**, pinned at SHA `7ae4ecd`. One file lives next to this note:
>
> - `native-galaxy-workflow.schema.json` — Draft-07 JSON Schema generated from `@galaxy-tool-util/schema`'s `NativeGalaxyWorkflowSchema` via `gxwf structural-schema --format native`. **Agents and casting should consume this** when reasoning about the JSON shape Galaxy actually exports/imports (the `.ga` format), as opposed to the human-authoring gxformat2 YAML.
>
> **Re-sync:** `pnpm sync:vendored --update`. Sync builds galaxy-tool-util-ts and re-runs the generator before copy.

## Boundary vs gxformat2

[[gxformat2-schema]] covers the human-authoring YAML format (`*.gxwf.yml`, `class: GalaxyWorkflow`). This schema covers the JSON format Galaxy server emits/consumes (`*.ga`, `a_galaxy_workflow: "true"`). gxformat2 transpiles into native; the two are not interchangeable line-by-line.

## Top-level shape

The schema declares required `[class, a_galaxy_workflow, format-version]` with `class: enum["NativeGalaxyWorkflow"]`. Optional: `uuid`, `name`, `annotation`, `tags`, `version`, `license`, `release`, `creator`, `report`, `readme`, `help`, `logo_url`, `doi`, `source_metadata`, `comments`, `steps`, `subworkflows`.

## Caveat: schema is stricter than reality

Real `.ga` files **do not carry a `class` field**. Tested against `$IWC/workflows/repeatmasking/RepeatMasking-Workflow.ga`: top keys are `a_galaxy_workflow, annotation, format-version, license, release, name, creator, steps, tags, uuid, version`. The schema's `required: ["class", ...]` rejects every real workflow Galaxy currently produces. Treat the schema as **vocabulary reference**, not a runtime validator for in-the-wild `.ga` files, until upstream relaxes the requirement or Galaxy starts emitting `class`. Worth filing on galaxy-tool-util-ts.

## Caveats

- **Doc strings dropped.** Same Effect-TS `JSONSchema.make` limitation as [[gxformat2-schema]].
- **Repeated `$id: "/schemas/unknown"` markers** appear 4× in this schema. Strict Ajv refuses to compile; pass `{ strict: false }` or strip duplicates before compile.
