---
name: validate-cwl
description: "Run cwltool --validate / schema lint, classify failures, recommend fixes."
---

# validate-cwl

Follow the procedure below and use the artifact/reference sections as the runtime contract.

## When To Use

- Run cwltool --validate / schema lint, classify failures, recommend fixes.

## Inputs

- Read artifact `cwl-workflow-draft`. Produced by `implement-cwl-tool-step`, `summary-to-cwl-template`. Assembled CWL Workflow to validate — the `cwl-workflow-draft.cwl` from implement-cwl-tool-step (`class: Workflow`); the build result `cwltool --validate` and schema lint run against.

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

## Feedback Mode

- Feedback mode is off unless the caller explicitly enables `--feedback` or supplies a feedback-ledger path.
- When enabled, read `_feedback.md` before doing the work and use its registered `foundry-feedback.ledger.yml` protocol.
- Preserve harness-owned run and phase state. Append only concrete, upstreamable observations about canonical Foundry source assets; do not put ordinary workflow requirements in this ledger.
- Pass the same ledger path to any subagent used for this work, and merge updates serially so one writer cannot overwrite another.

## Runtime Notes

- Do not read Foundry source files at runtime; use only files packaged in this skill bundle and user-supplied artifacts.
- Preserve declared artifact filenames unless the user or harness supplies explicit paths.
- Carry unresolved assumptions into the output artifact instead of silently inventing missing source evidence.
