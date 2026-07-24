---
name: summarize-cwl-tool
description: "Derive a CommandLineTool description (container, baseCommand, IO) for a CWL target."
---

# summarize-cwl-tool

Follow the procedure below and use the artifact/reference sections as the runtime contract.

## When To Use

- Derive a CommandLineTool description (container, baseCommand, IO) for a CWL target.

## Inputs

- No upstream artifact inputs declared. See the procedure for user-supplied runtime inputs.

## Outputs

- Write artifact `cwl-tool-summary` as `cwl-tool-summary.json`. Format: `json`. Compact CWL CommandLineTool summary: container, baseCommand, inputs, outputs, requirements, version metadata.

## Required Tools

- None declared. Procedure should not assume external CLIs are present.

## Load Upfront

- None declared.

## Load On Demand

- None declared.

## Validation

- None declared.

## Procedure

Read a tool's container, `baseCommand`, and IO evidence and emit a compact CWL CommandLineTool summary — container, baseCommand, inputs, outputs, requirements, and version metadata.

## Runtime Notes

- Do not read Foundry source files at runtime; use only files packaged in this skill bundle and user-supplied artifacts.
- Preserve declared artifact filenames unless the user or harness supplies explicit paths.
- Carry unresolved assumptions into the output artifact instead of silently inventing missing source evidence.
