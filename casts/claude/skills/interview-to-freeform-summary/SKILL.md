---
name: interview-to-freeform-summary
description: "Normalize a free-form user interview into the shared freeform-summary workflow handoff."
---

# interview-to-freeform-summary

Follow the procedure below and use the artifact/reference sections as the runtime contract.

## When To Use

- Normalize a free-form user interview into the shared freeform-summary workflow handoff.

## Inputs

- No upstream artifact inputs declared. See the procedure for user-supplied runtime inputs.

## Outputs

- Write artifact `freeform-summary` as `freeform-summary.md`. Format: `markdown`. Methods, tools, sample data, references, constraints, open questions, and workflow intent gathered from a user interview.

## Required Tools

- None declared. Procedure should not assume external CLIs are present.

## Load Upfront

- None declared.

## Load On Demand

- None declared.

## Validation

- None declared.

## Procedure

Turn a free-form user interview into the shared `freeform-summary` artifact consumed by downstream freeform-summary skills.

The harness owns the live interaction style. It may run this skill inside an interactive Claude/Codex session, feed it a saved transcript, or collect answers through a custom UI. The skill's job is the normalized handoff: methods, tools or algorithms, inputs, outputs, parameters, data availability, expected outputs, constraints, confidence, and open questions.

Emit Markdown, not a target workflow schema. Downstream skills treat this the same way they treat the output of summarize-paper: useful source evidence with explicit uncertainty, not a fully specified workflow.

## Runtime Notes

- Do not read Foundry source files at runtime; use only files packaged in this skill bundle and user-supplied artifacts.
- Preserve declared artifact filenames unless the user or harness supplies explicit paths.
- Carry unresolved assumptions into the output artifact instead of silently inventing missing source evidence.
