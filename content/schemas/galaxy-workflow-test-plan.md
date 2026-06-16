---
type: schema
name: galaxy-workflow-test-plan
title: Galaxy workflow test plan
package: "@galaxy-foundry/foundry"
package_export: "galaxyWorkflowTestPlanSchema"
validator_bin: foundry
validator_subcommand: validate-galaxy-workflow-test-plan
upstream: "https://github.com/galaxyproject/foundry/blob/main/packages/foundry/src/schemas/galaxy-workflow-test-plan/galaxy-workflow-test-plan.schema.json"
license: MIT
tags:
  - schema
  - target/galaxy
status: draft
created: 2026-06-16
revised: 2026-06-16
revision: 1
ai_generated: true
related_notes:
  - "[[tests-format]]"
  - "[[nextflow-test-to-galaxy-test-plan]]"
  - "[[cwl-test-to-galaxy-test-plan]]"
  - "[[freeform-summary-to-galaxy-test-plan]]"
  - "[[implement-galaxy-workflow-test]]"
summary: "JSON Schema for the intermediate Galaxy workflow test-plan handoff produced by the test-plan Molds and consumed by implement-galaxy-workflow-test."
---

This page is auto-rendered from the JSON Schema authored in this repo (orphan schema — no TypeScript producer Mold owns it, like [[summary-cwl]] and [[galaxy-tool-summary]]). Each `$def` becomes a section below with a stable anchor ID — Mold bodies and research notes can deep-link individual shapes via `[[galaxy-workflow-test-plan#AssertionIntent]]`.

The on-disk artifact is **YAML**, so it stays a reviewable handoff while remaining machine-validatable; YAML is a JSON superset, so the same AJV schema gates both.

**Source-of-truth chain:**

1. `packages/foundry/src/schemas/galaxy-workflow-test-plan/galaxy-workflow-test-plan.schema.json` — canonical JSON, hand-edited as part of the Mold/cast loop.
2. `packages/foundry/scripts/sync-schema.mjs` regenerates the typed `galaxy-workflow-test-plan.schema.generated.ts` const wrapper at `prebuild`.
3. Published as part of `@galaxy-foundry/foundry`, exporting `galaxyWorkflowTestPlanSchema` and the `foundry validate-galaxy-workflow-test-plan` subcommand.

Generated skills should validate emitted plans with:

```sh
foundry validate-galaxy-workflow-test-plan galaxy-test-plan.yml
```

## What This Models — and What It Does Not

The test plan is the **intermediate handoff** between a source-specific test-plan producer ([[nextflow-test-to-galaxy-test-plan]], [[cwl-test-to-galaxy-test-plan]], [[freeform-summary-to-galaxy-test-plan]]) and [[implement-galaxy-workflow-test]], which authors the final `*-tests.yml`. It preserves the *intent and provenance* of a test before any concrete `tests-format` file exists:

- `test_cases[]` — one entry per planned Galaxy workflow test, each with `job_inputs` and `expected_outputs`.
- `job_inputs[]` — workflow-label binding (`workflow_label` + `label_status`), `collection_shape`, `datatype`, and a `fixture` with storage class, location, checksum, and provenance.
- `expected_outputs[]` — output-label binding, `output_kind`, `collection_shape`, and `assertion_intent[]`.
- `assertion_intent[]` — a tests-format assertion **family by name** (`has_text`, `has_n_lines`, `has_size`, `compare:diff`, …), a plain-language `intent`, an optional `expected_value`, an optional `tolerance`, an optional collection `element_identifier`, plus `evidence` and `confidence`.
- `unresolved[]` / `omissions[]` / `warnings[]` — mappings left open, outputs deliberately unasserted (with rationale), and plan-construction warnings.

## Intentional Non-Goals

- **No duplication of [[tests-format]].** Assertion families are referenced by name; their parameter shapes, defaults, and discriminators live in the tests-format schema. The plan records *which* family and *why*, not the final YAML.
- **Not the final artifact.** [[implement-galaxy-workflow-test]] converts a schema-valid plan into a `tests-format` `*-tests.yml` and runs the static + workflow-label gates; the plan never substitutes for that file.
- **Source-agnostic structure.** The schema does not encode nf-test, CWL, or paper-specific *structure*; `source.kind` is a provenance label only. The `derived_from` / `evidence` axis (`test-evidence` vs `intent`) distinguishes a plan **translated** from upstream test fixtures from one **synthesized** from workflow intent — the only difference a freeform source needs. That axis appears at three nested levels by design: `source.derived_from` is the plan's dominant basis, `test_cases[].derived_from` lets a mostly-synthesized plan still carry an individual translated case (or `mixed`), and each `assertion_intent[].evidence` records the basis of one assertion — they layer, they are not interchangeable.

## Expressing Unknowns

A freeform-sourced plan is synthesized from intent and carries pervasive uncertainty; a nextflow/CWL plan is translated from concrete test evidence. The schema makes uncertainty **explicit rather than absent**:

- Nullable fields (`workflow_label`, `datatype`, `collection_shape`, `expected_value`, `location`, `checksum`, …) record "unknown" as `null`, not as an omitted key.
- `label_status` (`resolved` / `assumed` / `unresolved`) and `fixture.storage: unresolved` flag bindings and fixtures that are not yet pinned.
- `confidence` (`high` / `medium` / `low`) on each assertion intent lets synthesized assertions declare low confidence without dropping the assertion.
- `unresolved[]` carries the mappings a reviewer or [[implement-galaxy-workflow-test]] must settle, with a `blocking` flag.
