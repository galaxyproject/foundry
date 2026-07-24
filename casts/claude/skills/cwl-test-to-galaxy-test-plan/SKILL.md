---
name: cwl-test-to-galaxy-test-plan
description: "Translate CWL test fixtures into a Galaxy workflow test plan."
---

# cwl-test-to-galaxy-test-plan

Follow the procedure below and use the artifact/reference sections as the runtime contract.

## When To Use

- Translate CWL test fixtures into a Galaxy workflow test plan.

## Inputs

- Read artifact `summary-cwl`. Schema: summary-cwl. Produced by `summarize-cwl`. Structured CWL summary from summarize-cwl; carries test fixtures, job inputs, expected outputs.

## Outputs

- Write artifact `galaxy-test-plan` as `galaxy-test-plan.yml`. Format: `yaml`. Schema: galaxy-workflow-test-plan. Reviewable Galaxy workflow test plan (see galaxy-workflow-test-plan) derived from CWL test fixtures, job inputs, expected outputs, and assertion evidence.

## Required Tools

- None declared. Procedure should not assume external CLIs are present.

## Load Upfront

- `references/schemas/galaxy-workflow-test-plan.schema.json`: Schema file copied verbatim into the bundle. Output contract: the emitted plan conforms to galaxy-workflow-test-plan. Cast bundles the JSON Schema; validate with `foundry validate-galaxy-workflow-test-plan`.
- `references/schemas/summary-cwl.schema.json`: Schema file copied verbatim into the bundle. Read the CWL summary's test cases, job inputs, expected outputs, and assertion evidence.

## Load On Demand

- `references/notes/galaxy-workflow-testability-design.md`: Research note copied verbatim into the bundle. Choose which workflow outputs and promoted checkpoints make meaningful assertions. Use when: deciding which outputs to assert and which labels the plan should bind to.
- `references/notes/iwc-shortcuts-anti-patterns.md`: Research note copied verbatim into the bundle. Distinguish accepted IWC-style test shortcuts from assertion smells while translating tests. Use when: deciding whether to use existence-only, size-only, image-dimension, or tolerant output checks.
- `references/notes/iwc-test-data-conventions.md`: Research note copied verbatim into the bundle. Emit Galaxy/IWC-style job input fixtures, remote locations, hashes, and collection input shapes. Use when: writing job inputs or deciding whether fixtures belong in test-data, Zenodo, ENA/SRA, or CVMFS.
- `references/notes/planemo-asserts-idioms.md`: Research note copied verbatim into the bundle. Describe Galaxy workflow-test assertion intent and tolerances for translated expected outputs. Use when: turning CWL expected outputs into Galaxy test-plan assertions.
- `references/notes/planemo-workflow-test-architecture.md`: Research note copied verbatim into the bundle. Keep the plan addressable by stable labels and artifacts Planemo can connect back to invocations, jobs, and outputs. Use when: recording the labels and checkpoints the downstream test must address.
- `references/schemas/tests-format.schema.json`: Schema file copied verbatim into the bundle. Use the Galaxy workflow tests schema as the assertion-family vocabulary when translating CWL test evidence into a Galaxy test plan. Use when: mapping expected outputs, tolerances, or fixture assertions into Galaxy workflow-test assertion intent.

## Validation

- Validate `galaxy-test-plan.yml` before returning it: run `foundry validate-galaxy-workflow-test-plan galaxy-test-plan.yml` from `@galaxy-foundry/foundry`. If the command is not on PATH, run `npx --package @galaxy-foundry/foundry foundry validate-galaxy-workflow-test-plan galaxy-test-plan.yml`. This checks artifact `galaxy-test-plan` against the galaxy-workflow-test-plan schema.

## Procedure

Translate CWL test fixtures, job inputs, expected outputs, and assertion evidence into a Galaxy workflow test plan. The output is a reviewable YAML handoff conforming to galaxy-workflow-test-plan, not a concrete `tests-format` file; implement-galaxy-workflow-test owns final YAML authoring and static validation. Because this plan is translated from real CWL test fixtures, set `source.derived_from: test-evidence` and prefer `evidence: test-evidence` on the assertions it carries.

## Runtime Notes

- Do not read Foundry source files at runtime; use only files packaged in this skill bundle and user-supplied artifacts.
- Preserve declared artifact filenames unless the user or harness supplies explicit paths.
- Carry unresolved assumptions into the output artifact instead of silently inventing missing source evidence.
