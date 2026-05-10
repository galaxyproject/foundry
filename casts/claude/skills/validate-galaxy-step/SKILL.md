---
name: validate-galaxy-step
description: "Run gxwf validation on the just-implemented Galaxy step and route failures back to step implementation."
---

# validate-galaxy-step

Follow the procedure below and use the artifact/reference sections as the runtime contract.

## When To Use

- Run gxwf validation on the just-implemented Galaxy step and route failures back to step implementation.

## Inputs

- No upstream artifact inputs declared. See the procedure for user-supplied runtime inputs.

## Outputs

- None declared.

## Required Tools

- **`gxwf`** (gxwf). `npm install -g @galaxy-tool-util/cli`.
  Ephemeral run: `npx --package @galaxy-tool-util/cli gxwf`.
  Check: `gxwf --version`.
  Docs: https://github.com/jmchilton/galaxy-tool-util-ts/tree/main/packages/cli

## Load Upfront

- None declared.

## Load On Demand

- `references/cli/validate.json`: CLI command reference packaged as a sidecar. Validate a partial gxformat2 workflow while implementing one Galaxy step at a time. Use when: after a Galaxy step is implemented or modified inside the per-step loop.
- `references/notes/galaxy-tool-job-failure-reference.md`: Research note copied verbatim into the bundle. Keep static step validation findings distinct from wrapper-defined runtime failure semantics. Use when: a selected tool can validate structurally but may fail at runtime due to stdio rules, exit-code handling, dynamic outputs, or datatype behavior.

## Validation

- None declared.

## Procedure

Validate the Galaxy workflow fragment after one step has been implemented. The skill owns the inline validation loop: run gxwf validate, classify diagnostics that are local to the new step, and route failures back to implement-galaxy-tool-step or author-galaxy-tool-wrapper as appropriate.

This is separate from validate-galaxy-workflow because the harness behavior differs: step validation runs inside the per-step loop and should preserve local context about the step that just changed.

## Runtime Notes

- Do not read Foundry source files at runtime; use only files packaged in this skill bundle and user-supplied artifacts.
- Preserve declared artifact filenames unless the user or harness supplies explicit paths.
- Carry unresolved assumptions into the output artifact instead of silently inventing missing source evidence.
