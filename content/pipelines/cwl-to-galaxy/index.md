---
type: pipeline
title: CWL → GALAXY
tags:
  - source/cwl
  - target/galaxy
status: draft
created: 2026-04-30
revised: 2026-04-30
revision: 2
ai_generated: true
summary: "Path from a CWL Workflow to a Galaxy gxformat2 workflow. Lighter upstream extraction."
phases:
  - mold: "[[summarize-cwl]]"
  - mold: "[[cwl-summary-to-galaxy-interface]]"
  - mold: "[[cwl-summary-to-galaxy-data-flow]]"
  - mold: "[[compare-against-iwc-exemplar]]"
  - mold: "[[cwl-summary-to-galaxy-template]]"
  - mold: "[[advance-galaxy-draft-step]]"
    loop: true
  - branch: test-data-resolution
    chain:
      - "[[cwl-to-test-data]]"
      - "[[find-test-data]]"
      - user-supplied
  - mold: "[[cwl-test-to-galaxy-test-plan]]"
  - mold: "[[implement-galaxy-workflow-test]]"
  - mold: "[[validate-galaxy-workflow]]"
  - mold: "[[run-workflow-test]]"
  - mold: "[[debug-galaxy-workflow-output]]"
---

# CWL → GALAXY

Direct path. Lifted from `docs/HARNESS_PIPELINES.md` §"CWL → GALAXY".

CWL is already structured, so the upstream `summarize-cwl → cwl-summary-to-galaxy-interface → cwl-summary-to-galaxy-data-flow` chain is much lighter than its Nextflow counterpart. The per-step Galaxy authoring tier downstream is identical to the other Galaxy-targeting pipelines.
