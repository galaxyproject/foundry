---
name: freeform-summary-to-cwl-design
description: "Translate a free-form source summary into a CWL workflow design brief."
---

# freeform-summary-to-cwl-design

Follow the procedure below and use the artifact/reference sections as the runtime contract.

## When To Use

- Translate a free-form source summary into a CWL workflow design brief.

## Inputs

- Read artifact `freeform-summary`. Produced by `interview-to-freeform-summary`, `summarize-paper`. Free-form source summary emitted by summarize-paper or interview-to-freeform-summary; methods, tools, sample data, references, and workflow intent.

## Outputs

- Write artifact `freeform-cwl-design` as `freeform-cwl-design.md`. Format: `markdown`. Combined CWL interface + data-flow design brief; a single reviewable handoff for free-form sources until examples justify a split.

## Required Tools

- None declared. Procedure should not assume external CLIs are present.

## Load Upfront

- None declared.

## Load On Demand

- None declared.

## Validation

- None declared.

## Procedure

Read a free-form source summary and emit a reviewable Markdown CWL workflow design brief. Combine interface choices and abstract data-flow choices until free-form source examples justify a cleaner split.

The output is not a concrete CWL Workflow. summary-to-cwl-template turns this brief and the free-form summary into a skeleton.

## Feedback Mode

- Feedback mode is off unless the caller explicitly enables `--feedback` or supplies a feedback-ledger path.
- When enabled, read `_feedback.md` before doing the work and use its registered `foundry-feedback.ledger.yml` protocol.
- Preserve harness-owned run and phase state. Append only concrete, upstreamable observations about canonical Foundry source assets; do not put ordinary workflow requirements in this ledger.
- Pass the same ledger path to any subagent used for this work, and merge updates serially so one writer cannot overwrite another.

## Runtime Notes

- Do not read Foundry source files at runtime; use only files packaged in this skill bundle and user-supplied artifacts.
- Preserve declared artifact filenames unless the user or harness supplies explicit paths.
- Carry unresolved assumptions into the output artifact instead of silently inventing missing source evidence.
