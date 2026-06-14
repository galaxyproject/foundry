---
type: pipeline
title: NEXTFLOW → CWL
tags:
  - pipeline
  - source/nextflow
  - target/cwl
status: draft
created: 2026-04-30
revised: 2026-04-30
revision: 2
ai_generated: true
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

Direct path. Lifted from `docs/HARNESS_PIPELINES.md` §"NEXTFLOW → CWL".

NF brings real test fixtures, so `nextflow-test-to-cwl-test-plan` replaces the `[branch] test-data-resolution` chain that paper-sourced pipelines need.
