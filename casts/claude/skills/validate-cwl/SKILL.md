---
name: validate-cwl
description: "Run cwltool --validate / schema lint, classify failures, recommend fixes."
---

# validate-cwl

Follow the procedure below and use the artifact/reference sections as the runtime contract.

## When To Use

- Run cwltool --validate / schema lint, classify failures, recommend fixes.

## Inputs

- No upstream artifact inputs declared. See the procedure for user-supplied runtime inputs.

## Outputs

- None declared.

## Required Tools

- None declared. Procedure should not assume external CLIs are present.

## Load Upfront

- None declared.

## Load On Demand

- None declared.

## Validation

- None declared.

## Procedure

Run `cwltool --validate` and schema lint over the assembled CWL workflow, classify each diagnostic, and recommend a concrete fix — routing failures back to the authoring step that owns them.

## Runtime Notes

- Do not read Foundry source files at runtime; use only files packaged in this skill bundle and user-supplied artifacts.
- Preserve declared artifact filenames unless the user or harness supplies explicit paths.
- Carry unresolved assumptions into the output artifact instead of silently inventing missing source evidence.
