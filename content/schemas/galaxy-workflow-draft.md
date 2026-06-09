---
type: schema
name: galaxy-workflow-draft
title: Galaxy workflow draft (gxformat2 superset)
package: "@galaxy-tool-util/schema"
package_export: "galaxyWorkflowDraftJsonSchema"
upstream: "https://github.com/jmchilton/galaxy-tool-util-ts/blob/main/packages/schema/src/workflow/raw/gxformat2-draft.effect.ts"
license: MIT
license_file: LICENSES/galaxy-tool-util-ts.LICENSE
tags:
  - schema
  - target/galaxy
status: draft
created: 2026-05-27
revised: 2026-05-27
revision: 1
ai_generated: true
related_notes:
  - "[[galaxy-workflow-draft-format]]"
  - "[[galaxy-data-flow-draft-contract]]"
  - "[[gxformat2-schema]]"
  - "[[draft-validate]]"
  - "[[draft-next-step]]"
  - "[[draft-extract]]"
related_molds:
  - "[[nextflow-summary-to-galaxy-template]]"
  - "[[cwl-summary-to-galaxy-template]]"
  - "[[paper-summary-to-galaxy-template]]"
  - "[[implement-galaxy-tool-step]]"
summary: "JSON Schema for `class: GalaxyWorkflowDraft` — gxformat2 with `TODO_*` sentinels and `_plan_*` planning fields per draft step."
---

This page is auto-rendered from `@galaxy-tool-util/schema`'s `galaxyWorkflowDraftJsonSchema` export — the plain JSON Schema (2020-12) sibling of the Effect `GalaxyWorkflowDraftSchema`, both generated from `v19_09/draft_workflow.yml` in [gxformat2 PR #219](https://github.com/galaxyproject/gxformat2/pull/219). The Foundry does **not** maintain a separate copy — template Molds emit this shape; per-step implementation and validation Molds consume it; cast imports the named runtime export and serializes it into cast bundles.

**Source-of-truth chain:**

1. `v19_09/draft_workflow.yml` in [galaxyproject/gxformat2 PR #219](https://github.com/galaxyproject/gxformat2/pull/219) — canonical SALAD schema for the draft superset (WIP upstream).
2. `make sync-schema-sources` in [jmchilton/galaxy-tool-util-ts](https://github.com/jmchilton/galaxy-tool-util-ts) copies the SALAD source; `make generate-schemas` emits `gxformat2-draft.ts` + `gxformat2-draft.effect.ts` next to the concrete gxformat2 outputs. See [PR #100](https://github.com/jmchilton/galaxy-tool-util-ts/pull/100).
3. Published as `@galaxy-tool-util/schema` on npm; the Foundry pins a version in `packages/foundry/package.json` and `packages/foundry/scripts/sync-schema.mjs` mirrors the JSON form at `prebuild`. Site rendering imports the schema via `site/src/lib/schema-registry.ts`; cast imports `GalaxyWorkflowDraftSchema` and serializes it into cast bundles.

**JSON-Schema export (resolved in 1.7.x).** Earlier (`@galaxy-tool-util/schema@1.6.0`) only the Effect schema function `GalaxyWorkflowDraftSchema` was exported (PR #106), which cast cannot serialize — so producers declaring `output_artifacts[].schema = [[galaxy-workflow-draft]]` could not list a matching `kind: schema` reference without tripping the "named in the contract but not packaged" validator warning. `@galaxy-tool-util/schema@1.7.1` adds the plain JSON Schema (2020-12) sibling `galaxyWorkflowDraftJsonSchema` (survives `JSON.stringify`, mirroring `testsSchema` / `parsedToolSchema`). This note now points `package_export` at it, the five producers carry the `kind: schema` reference, and cast bundles `galaxy-workflow-draft.schema.json`. Runtime validation in skills is still via [[draft-validate]] (CLI), which exercises rules the static schema can't.

**At runtime in cast skills:** validation should happen through the CLI commands [[draft-validate]] (draft-contract rules; with `--concrete`, also runs the full concrete `gxformat2` rules on the extracted subset) and [[draft-extract]] | [[validate]] (when the concrete projection is needed as a standalone artifact), not by re-implementing schema checks. The published `@galaxy-tool-util/schema` continues to expose the pure-logic helpers (`detectDraft`, `validateDraft`, `nextDraftStep`, `extractConcreteSubset`, `stripPlanFields`, `promoteFullyConcreteDrafts`) for TypeScript consumers that need direct programmatic access.

## What the schema describes

The draft is **gxformat2 with two relaxations** scoped to tool steps:

- **`TODO_*` sentinels** are accepted anywhere a wrapper-tier identifier would normally go (`tool_id`, port names in `in:` / `out:` / `outputSource`, source references). The sentinel form `^TODO([_-][A-Za-z0-9_]+)?$` is enforced; `TODONE` and `TODOLIST` are not sentinels.
- **`_plan_*` planning fields** (`_plan_state`, `_plan_context`, `_plan_in`, `_plan_out`) carry free-text intent on drafty tool steps, populated by template Molds and consumed by per-step implementation Molds. Fully-resolved tool steps must not carry `_plan_*` — that's a `semanticError` from [[draft-validate]].

Topology (workflow inputs, outputs, step set, producer→consumer edges, branches, `when:` guards) is **fully concrete** in a valid draft — the relaxations live at wrapper-tier only. See [[galaxy-workflow-draft-format]] for the design rationale and [[galaxy-data-flow-draft-contract]] for the data-flow invariants the template Mold must establish before handing off.

## Why not duplicate the concrete schema

`class: GalaxyWorkflowDraft` and `class: GalaxyWorkflow` share most of their structural vocabulary. The draft schema layers the two relaxations on top of the concrete shape rather than forking it; once `promoteFullyConcreteDrafts` flips a draft to `class: GalaxyWorkflow`, the document validates against the concrete `[[gxformat2-schema]]` with no further transformation. Cast skills that need to verify the concrete subset of an in-progress draft pipe through [[draft-extract]] and hand the result to [[validate]] (or use [[draft-validate]] `--concrete` to run both in one call).
