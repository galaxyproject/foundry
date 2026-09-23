---
type: pipeline
title: NEXTFLOW → CWL
tags:
  - source/nextflow
  - target/cwl
status: draft
created: 2026-04-30
revised: 2026-09-22
revision: 3
summary: "Direct path from a Nextflow pipeline to a CWL Workflow + CommandLineTool set."
harness_notes:
  - "NF brings real test fixtures, so `nextflow-test-to-cwl-test-plan` replaces the `test-data-resolution` chain that paper-sourced pipelines need."
phases:
  - mold: "[[summarize-nextflow]]"
  - mold: "[[nextflow-summary-to-cwl-interface]]"
  - mold: "[[nextflow-summary-to-cwl-data-flow]]"
  - mold: "[[summary-to-cwl-template]]"
  - mold: "[[summarize-cwl-tool]]"
    loop: true
  - mold: "[[implement-cwl-tool-step]]"
    loop: true
  - mold: "[[validate-cwl]]"
    loop: true
  - mold: "[[nextflow-test-to-cwl-test-plan]]"
  - mold: "[[implement-cwl-workflow-test]]"
  - mold: "[[validate-cwl]]"
  - mold: "[[run-workflow-test]]"
  - mold: "[[debug-cwl-workflow-output]]"
---

# NEXTFLOW → CWL

Start with a Nextflow source tree pinned to a tag or commit and its available nf-test cases, fixtures, snapshots, and expected outputs. Review the selected test case in `summary-nextflow.json`. If no whole-pipeline case is available, record the narrower scope and deferred cases before planning the CWL test.

Review the CWL interface and data-flow briefs against the source. Confirm primary inputs and outputs, `scatter` and `when` choices, and any stated scope reductions. For each placeholder step, check the command, software provenance, and input and output bindings before implementing and validating it. The CWL loop has no shared completion check, so inspect the draft for remaining placeholders and unresolved `run:` targets.

Check that `cwl-test-plan.md` and `cwl-job.yml` use the selected source test evidence and match the implemented CWL ports. Report unavailable fixtures or narrow coverage instead of treating a partial test as full coverage.

Inspect the final validation diagnostics and any `workflow-test-result.json` or CWL debug report. Structural validation does not establish scientific equivalence. The CWL run path remains unproven end to end, so report whether a test ran, what it exercised, and any failures with the workflow.
