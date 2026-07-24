---
name: summary-to-cwl-template
description: "CWL Workflow skeleton with per-step TODOs from source and design handoffs."
---

# summary-to-cwl-template

Follow the procedure below and use the artifact/reference sections as the runtime contract.

## When To Use

- CWL Workflow skeleton with per-step TODOs from source and design handoffs.

## Inputs

- No upstream artifact inputs declared. See the procedure for user-supplied runtime inputs.

## Outputs

- Write artifact `cwl-workflow-draft` as `cwl-workflow-draft.cwl`. Format: `yaml`. CWL Workflow skeleton: inputs, outputs, placeholder steps, rough connections, TODO slots for later implementation Molds.

## Required Tools

- None declared. Procedure should not assume external CLIs are present.

## Load Upfront

- None declared.

## Load On Demand

- None declared.

## Validation

- None declared.

## Procedure

Read the original source artifact, the source summary, and all prior source-target design handoffs from the pipeline run. Emit a CWL Workflow skeleton with inputs, outputs, placeholder steps, rough connections, and TODO slots for later implementation skills.

The interface and data-flow briefs guide the skeleton, but they do not replace source evidence. Treat the prior-step index as the working context: source summary, interface brief, data-flow brief or freeform design brief, and any open questions carried forward.

## Runtime Notes

- Do not read Foundry source files at runtime; use only files packaged in this skill bundle and user-supplied artifacts.
- Preserve declared artifact filenames unless the user or harness supplies explicit paths.
- Carry unresolved assumptions into the output artifact instead of silently inventing missing source evidence.
