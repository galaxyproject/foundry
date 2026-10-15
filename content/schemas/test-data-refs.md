---
type: schema
name: test-data-refs
title: Galaxy workflow test-data refs
package: "@galaxy-foundry/gxwf-foundry"
package_export: "testDataRefsSchema"
validator_bin: foundry
validator_subcommand: validate-test-data-refs
upstream: "https://github.com/galaxyproject/foundry/blob/main/packages/gxwf-foundry/src/schemas/test-data-refs/test-data-refs.schema.json"
license: MIT
tags:
  - target/galaxy
status: draft
created: 2026-10-15
revised: 2026-10-15
revision: 1
related_notes:
  - "[[galaxy-workflow-test-plan]]"
  - "[[iwc-test-data-conventions]]"
  - "[[galaxy-workflow-testability-design]]"
related_molds:
  - "[[nextflow-to-test-data]]"
  - "[[cwl-to-test-data]]"
  - "[[paper-to-test-data]]"
  - "[[find-test-data]]"
  - "[[implement-galaxy-workflow-test]]"
summary: "JSON Schema for the test data each Galaxy workflow input gets, written by the test-data-resolution chain and read by implement-galaxy-workflow-test."
---

This page is auto-rendered from the JSON Schema authored in this repo. Each `$def` becomes a section below with a stable anchor ID, e.g. [[test-data-refs#Ref]].

**Source-of-truth chain:**

1. `packages/gxwf-foundry/src/schemas/test-data-refs/test-data-refs.schema.json` — the canonical JSON, hand-edited.
2. `packages/gxwf-foundry/scripts/sync-schema.mjs` regenerates the typed `test-data-refs.schema.generated.ts` wrapper at `prebuild`.
3. Published in `@galaxy-foundry/gxwf-foundry` as `testDataRefsSchema`, with the `foundry validate-test-data-refs` subcommand.

```sh
foundry validate-test-data-refs test-data-refs.json
```

## What This Models

The pipelines' `test-data-resolution` branch is a chain that fills gaps, not a choice between alternatives. A source-specific Mold ([[nextflow-to-test-data]], [[cwl-to-test-data]], [[paper-to-test-data]]) maps the data the source declares. [[find-test-data]] then searches for whatever the first leg left unresolved. Anything still unresolved goes to the user. Every leg writes the same `test-data-refs.json`.

- `refs[]` — one entry per workflow input label.
- `resolved` — `true` when the ref points at real data of the required shape, `false` for an honest gap with a `reason`. Whether the chain is done is a deterministic question: does any ref have `resolved: false`?
- `resolved_by` — the Mold that resolved the input. A later leg keeps an earlier leg's resolved entries, this field included, and replaces only the unresolved ones.
- `fixture` — the same shape as [[galaxy-workflow-test-plan#Fixture]] (storage class, location, checksum, provenance), so a ref's fixture drops into a test plan unchanged. An unresolved ref has `storage: unresolved` and no location.
- `elements[]` — collection elements, nested for nested shapes (`list:paired` → sample → `forward`/`reverse`), each with its own fixture. A resolved collection has either a location or at least one element.
- `prep` — the import-boundary prep (subset, split, concatenation) needed to reach the Galaxy shape from the source data.

## Not Enforced Here

- **One entry per label.** JSON Schema can't express uniqueness by key; [[find-test-data]]'s eval checks full input coverage.
- **The data exists.** The schema checks shape, not that a URL resolves or a checksum matches.
