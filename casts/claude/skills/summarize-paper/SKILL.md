---
name: summarize-paper
description: "Extract methods, tools, sample data, and references from a paper."
---

# summarize-paper

Follow the procedure below and use the artifact/reference sections as the runtime contract.

## When To Use

- Extract methods, tools, sample data, and references from a paper.

## Inputs

- No upstream artifact inputs declared. See the procedure for user-supplied runtime inputs.

## Outputs

- Write artifact `freeform-summary` as `freeform-summary.md`. Format: `markdown`. Methods, tools, sample data, references, and workflow intent extracted from a primary paper, normalized into the shared free-form source summary handoff.

## Required Tools

- None declared. Procedure should not assume external CLIs are present.

## Load Upfront

- None declared.

## Load On Demand

- None declared.

## Validation

- None declared.

## Procedure

Read a methods/tool paper and emit a free-form Markdown summary capturing the workflow's steps, tools, parameters, and sample/reference-data leads.

Emit the same `freeform-summary` artifact shape used by interview-derived sources so downstream freeform-summary skills can operate on paper and interview starts without splitting the design/template tier.

## Runtime Notes

- Do not read Foundry source files at runtime; use only files packaged in this skill bundle and user-supplied artifacts.
- Preserve declared artifact filenames unless the user or harness supplies explicit paths.
- Carry unresolved assumptions into the output artifact instead of silently inventing missing source evidence.
