---
name: paper-to-test-data
description: "Derive workflow test inputs and expected outputs from a paper."
---

# paper-to-test-data

Follow the procedure below and use the artifact/reference sections as the runtime contract.

## When To Use

- Derive workflow test inputs and expected outputs from a paper.

## Inputs

- Read artifact `freeform-summary`. Produced by `interview-to-freeform-summary`, `summarize-paper`. Free-form summary from summarize-paper; sample data and reference evidence the test fixtures derive from.

## Outputs

- Write artifact `test-data-refs` as `test-data-refs.json`. Format: `json`. Resolved workflow test inputs and expected outputs derived from paper evidence (URLs, file shapes, expected hashes).

## Required Tools

- None declared. Procedure should not assume external CLIs are present.

## Load Upfront

- None declared.

## Load On Demand

- None declared.

## Validation

- None declared.

## Procedure

Read the paper free-form summary from summarize-paper and derive concrete workflow test inputs and expected outputs — resolvable URLs, file shapes, and expected hashes — emitted as `test-data-refs`.

## Runtime Notes

- Do not read Foundry source files at runtime; use only files packaged in this skill bundle and user-supplied artifacts.
- Preserve declared artifact filenames unless the user or harness supplies explicit paths.
- Carry unresolved assumptions into the output artifact instead of silently inventing missing source evidence.
