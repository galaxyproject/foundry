---
name: nextflow-test-to-cwl-test-plan
description: "Translate Nextflow test evidence into a CWL workflow test plan."
---

# nextflow-test-to-cwl-test-plan

Follow the procedure below and use the artifact/reference sections as the runtime contract.

## When To Use

- Translate Nextflow test evidence into a CWL workflow test plan.

## Inputs

- Read artifact `summary-nextflow`. Schema: summary-nextflow. Produced by `summarize-nextflow`. Structured Nextflow summary from summarize-nextflow; carries test_fixtures, nf_tests, snapshot evidence.

## Outputs

- Write artifact `cwl-test-plan` as `cwl-test-plan.md`. Format: `markdown`. Reviewable CWL workflow test plan: job inputs, expected outputs, assertions, fixtures, rationale provenance.

## Required Tools

- None declared. Procedure should not assume external CLIs are present.

## Load Upfront

- `references/schemas/summary-nextflow.schema.json`: Schema file copied verbatim into the bundle. Read summarized nf-test profiles, snapshot fixtures, selected test data, params, and expected outputs.

## Load On Demand

- None declared.

## Validation

- None declared.

## Procedure

Translate Nextflow test evidence into a CWL workflow test plan. This preserves the `NEXTFLOW → CWL` pipeline after the Galaxy-specific test-plan split; concrete CWL test artifact assembly remains owned by implement-cwl-workflow-test.

## Runtime Notes

- Do not read Foundry source files at runtime; use only files packaged in this skill bundle and user-supplied artifacts.
- Preserve declared artifact filenames unless the user or harness supplies explicit paths.
- Carry unresolved assumptions into the output artifact instead of silently inventing missing source evidence.
