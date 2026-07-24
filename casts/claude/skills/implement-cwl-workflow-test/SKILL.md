---
name: implement-cwl-workflow-test
description: "Assemble CWL job file(s) and expected-output assertions."
---

# implement-cwl-workflow-test

Follow the procedure below and use the artifact/reference sections as the runtime contract.

## When To Use

- Assemble CWL job file(s) and expected-output assertions.

## Inputs

- Read artifact `cwl-test-plan`. Produced by `nextflow-test-to-cwl-test-plan`. Reviewable CWL test plan from nextflow-test-to-cwl-test-plan (or future CWL test-plan producers); job, fixture, assertion provenance.
- Read artifact `cwl-workflow-draft`. Produced by `implement-cwl-tool-step`, `summary-to-cwl-template`. CWL Workflow being tested; provides input/output ports and shapes the job + assertions must match.

## Outputs

- Write artifact `cwl-workflow-test` as `cwl-job.yml`. Format: `yaml`. CWL job file(s) with inputs and expected-output assertions for the implemented workflow.

## Required Tools

- None declared. Procedure should not assume external CLIs are present.

## Load Upfront

- None declared.

## Load On Demand

- None declared.

## Validation

- None declared.

## Procedure

Assemble the CWL job file(s) and expected-output assertions for the drafted workflow from its reviewed nextflow-test-to-cwl-test-plan test plan and the workflow's input/output ports.

## Runtime Notes

- Do not read Foundry source files at runtime; use only files packaged in this skill bundle and user-supplied artifacts.
- Preserve declared artifact filenames unless the user or harness supplies explicit paths.
- Carry unresolved assumptions into the output artifact instead of silently inventing missing source evidence.
