---
type: schema
name: galaxy-workflow-test-plan
title: Galaxy workflow test plan
package: "@galaxy-foundry/galaxy-workflow-test-plan-schema"
package_export: "galaxyWorkflowTestPlanSchema"
validator_bin: validate-galaxy-workflow-test-plan
upstream: "https://github.com/jmchilton/foundry/blob/main/packages/galaxy-workflow-test-plan-schema/src/galaxy-workflow-test-plan.schema.json"
tags:
  - schema
  - target/galaxy
status: draft
created: 2026-05-08
revised: 2026-05-08
revision: 1
ai_generated: true
related_molds:
  - "[[nextflow-test-to-galaxy-test-plan]]"
  - "[[cwl-test-to-galaxy-test-plan]]"
  - "[[implement-galaxy-workflow-test]]"
related_notes:
  - "[[cwl-test-to-galaxy-test-plan]]"
  - "[[implement-galaxy-workflow-test]]"
  - "[[nextflow-test-to-galaxy-test-plan]]"
  - "[[tests-format]]"
summary: "JSON Schema for the intermediate Galaxy workflow test-plan handoff."
---

This page is auto-rendered from the JSON Schema authored in this repo. Each `$def` becomes a section below with a stable anchor ID, so Mold bodies can deep-link shapes such as [[galaxy-workflow-test-plan#test_case]].

**Source-of-truth chain:**

1. `packages/galaxy-workflow-test-plan-schema/src/galaxy-workflow-test-plan.schema.json` — the canonical JSON, hand-edited as part of the Galaxy workflow-test handoff loop. Test-plan producer Molds cite it via `output_artifacts[].schema`; cast imports the `galaxyWorkflowTestPlanSchema` runtime export and serializes it into cast bundles.
2. `packages/galaxy-workflow-test-plan-schema/scripts/sync-schema.mjs` runs at `prebuild`, regenerating the typed `galaxy-workflow-test-plan.schema.generated.ts` const wrapper from the canonical JSON.
3. Published as `@galaxy-foundry/galaxy-workflow-test-plan-schema` on npm. Site rendering imports the schema directly from this package via `site/src/lib/schema-registry.ts`; the package also exports `validateGalaxyWorkflowTestPlan()` and ships a `validate-galaxy-workflow-test-plan` CLI bin.

**At runtime in cast skills:** validation should happen through the CLI command:

```sh
validate-galaxy-workflow-test-plan galaxy-workflow-test-plan.json
```

This schema is the reviewable handoff between source-test translators and [[implement-galaxy-workflow-test]]. It preserves fixture provenance, workflow-label assumptions, collection shapes, expected outputs, assertion intent, tolerances, omissions, unresolved mappings, and snapshot-derived evidence.

It intentionally does **not** duplicate [[tests-format]]. The final Galaxy workflow test file remains owned by [[tests-format]]; this handoff only records enough intent for [[implement-galaxy-workflow-test]] to author and validate that final artifact.
