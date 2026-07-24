---
name: nextflow-summary-to-cwl-interface
description: "Map a Nextflow summary into a CWL Workflow interface design brief."
---

# nextflow-summary-to-cwl-interface

Follow the procedure below and use the artifact/reference sections as the runtime contract.

## When To Use

- Map a Nextflow summary into a CWL Workflow interface design brief.

## Inputs

- Read artifact `summary-nextflow`. Schema: summary-nextflow. Produced by `summarize-nextflow`. Structured Nextflow pipeline summary emitted by summarize-nextflow; the source-of-truth JSON for CWL interface choices.

## Outputs

- Write artifact `nextflow-cwl-interface` as `nextflow-cwl-interface.md`. Format: `markdown`. Reviewable Markdown brief: CWL Workflow inputs, outputs, labels, array/record/File shapes, checkpoint outputs, source provenance.

## Required Tools

- None declared. Procedure should not assume external CLIs are present.

## Load Upfront

- `references/schemas/summary-nextflow.schema.json`: Schema file copied verbatim into the bundle. Read source-level channel, parameter, process, and test-fixture evidence before choosing CWL Workflow inputs and outputs.

## Load On Demand

- None declared.

## Validation

- None declared.

## Procedure

Read a Nextflow summary and emit a reviewable Markdown interface brief for a CWL Workflow. Capture workflow inputs, workflow outputs, labels, array/record/File shapes, checkpoint outputs worth exposing for tests, source-summary provenance, confidence, and open questions.

The output is a design handoff consumed by nextflow-summary-to-cwl-data-flow, summary-to-cwl-template, and later test-plan work.

## Runtime Notes

- Do not read Foundry source files at runtime; use only files packaged in this skill bundle and user-supplied artifacts.
- Preserve declared artifact filenames unless the user or harness supplies explicit paths.
- Carry unresolved assumptions into the output artifact instead of silently inventing missing source evidence.
