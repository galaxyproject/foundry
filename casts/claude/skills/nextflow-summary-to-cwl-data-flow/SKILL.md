---
name: nextflow-summary-to-cwl-data-flow
description: "Translate a Nextflow summary into a CWL data-flow design brief."
---

# nextflow-summary-to-cwl-data-flow

Follow the procedure below and use the artifact/reference sections as the runtime contract.

## When To Use

- Translate a Nextflow summary into a CWL data-flow design brief.

## Inputs

- Read artifact `summary-nextflow`. Schema: summary-nextflow. Produced by `summarize-nextflow`. Structured Nextflow pipeline summary emitted by summarize-nextflow; consumed alongside the CWL interface brief.
- Read artifact `nextflow-cwl-interface`. Produced by `nextflow-summary-to-cwl-interface`. Preceding CWL interface brief from nextflow-summary-to-cwl-interface that pins inputs, outputs, and labels.

## Outputs

- Write artifact `nextflow-cwl-data-flow` as `nextflow-cwl-data-flow.md`. Format: `markdown`. Reviewable Markdown brief: abstract topology, scatter/gather choices, value transformations, unresolved CommandLineTool needs, confidence.

## Required Tools

- None declared. Procedure should not assume external CLIs are present.

## Load Upfront

- `references/schemas/summary-nextflow.schema.json`: Schema file copied verbatim into the bundle. Read process, channel, operator, and fixture structure while drafting CWL-facing abstract data flow.

## Load On Demand

- None declared.

## Validation

- None declared.

## Procedure

Read a Nextflow summary plus the preceding CWL interface brief and emit a reviewable Markdown data-flow brief. Capture abstract operations, CWL scatter/gather choices, value transformations, unresolved CommandLineTool needs, confidence, and open questions.

The output is not a concrete CWL Workflow. summary-to-cwl-template turns this handoff and the interface brief into a skeleton.

## Runtime Notes

- Do not read Foundry source files at runtime; use only files packaged in this skill bundle and user-supplied artifacts.
- Preserve declared artifact filenames unless the user or harness supplies explicit paths.
- Carry unresolved assumptions into the output artifact instead of silently inventing missing source evidence.
