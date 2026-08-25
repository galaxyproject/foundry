---
name: implement-cwl-tool-step
description: "Convert an abstract step into a concrete CWL CommandLineTool + step."
---

# implement-cwl-tool-step

Follow the procedure below and use the artifact/reference sections as the runtime contract.

## When To Use

- Convert an abstract step into a concrete CWL CommandLineTool + step.

## Inputs

- Read artifact `cwl-tool-summary`. Produced by `summarize-cwl-tool`. Compact CWL tool summary from summarize-cwl-tool; binds the abstract step to a concrete CommandLineTool.
- Read artifact `cwl-workflow-draft`. Produced by `implement-cwl-tool-step`, `summary-to-cwl-template`. CWL Workflow skeleton being filled in step by step; the step replaces a placeholder in this draft.

## Outputs

- Write artifact `cwl-workflow-draft` as `cwl-workflow-draft.cwl`. Format: `yaml`. CWL Workflow skeleton with one more abstract step replaced by a concrete CommandLineTool step (loop iteration output).

## Required Tools

- None declared. Procedure should not assume external CLIs are present.

## Load Upfront

- None declared.

## Load On Demand

- None declared.

## Validation

- None declared.

## Procedure

Bind one abstract step to a concrete CWL CommandLineTool using its summarize-cwl-tool summary, replacing a single placeholder in the CWL workflow draft per loop iteration.

## Feedback Mode

- Feedback mode is off unless the caller explicitly enables `--feedback` or supplies a feedback-ledger path.
- When enabled, read `_feedback.md` before doing the work and use its registered `foundry-feedback.ledger.yml` protocol.
- Preserve harness-owned run and phase state. Append only concrete, upstreamable observations about canonical Foundry source assets; do not put ordinary workflow requirements in this ledger.
- Pass the same ledger path to any subagent used for this work, and merge updates serially so one writer cannot overwrite another.

## Runtime Notes

- Do not read Foundry source files at runtime; use only files packaged in this skill bundle and user-supplied artifacts.
- Preserve declared artifact filenames unless the user or harness supplies explicit paths.
- Carry unresolved assumptions into the output artifact instead of silently inventing missing source evidence.
