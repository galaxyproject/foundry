---
name: debug-cwl-workflow-output
description: "Triage failing CWL run outputs; classify failure modes; propose fixes."
---

# debug-cwl-workflow-output

Follow the procedure below and use the artifact/reference sections as the runtime contract.

## When To Use

- Triage failing CWL run outputs; classify failure modes; propose fixes.

## Inputs

- Read artifact `workflow-test-result`. Produced by `run-workflow-test`. Structured run handoff from run-workflow-test: test result, run/job/artifact context, and the observed CWL failure modality.

## Outputs

- Write artifact `cwl-workflow-debug-report` as `cwl-workflow-debug-report.md`. Format: `markdown`. CWL failure-surface classification with captured run/job/output evidence and a recommended next step or reference-gap follow-up.

## Required Tools

- None declared. Procedure should not assume external CLIs are present.

## Load Upfront

- None declared.

## Load On Demand

- None declared.

## Validation

- None declared.

## Procedure

Triage a failing CWL run: classify the failure mode from logs and outputs and propose a fix routed to the authoring step responsible for it.

## Runtime Notes

- Do not read Foundry source files at runtime; use only files packaged in this skill bundle and user-supplied artifacts.
- Preserve declared artifact filenames unless the user or harness supplies explicit paths.
- Carry unresolved assumptions into the output artifact instead of silently inventing missing source evidence.
