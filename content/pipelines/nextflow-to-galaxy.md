---
type: pipeline
title: NEXTFLOW → GALAXY
tags:
  - pipeline
  - source/nextflow
  - target/galaxy
status: draft
created: 2026-04-30
revised: 2026-05-10
revision: 3
ai_generated: true
summary: "Direct path from a Nextflow pipeline to a Galaxy gxformat2 workflow."
phases:
  - mold: "[[summarize-nextflow]]"
  - mold: "[[nextflow-summary-to-galaxy-reference-data]]"
  - mold: "[[nextflow-summary-to-galaxy-interface]]"
  - mold: "[[nextflow-summary-to-galaxy-data-flow]]"
  - mold: "[[compare-against-iwc-exemplar]]"
  - mold: "[[nextflow-summary-to-galaxy-template]]"
  - branch: discover-or-author
    loop: true
    branches:
      - "[[discover-shed-tool]]"
      - fallthrough: "[[author-galaxy-tool-wrapper]]"
  - mold: "[[summarize-galaxy-tool]]"
    loop: true
  - mold: "[[implement-galaxy-tool-step]]"
    loop: true
  - mold: "[[validate-galaxy-step]]"
    loop: true
  - mold: "[[nextflow-test-to-galaxy-test-plan]]"
  - mold: "[[implement-galaxy-workflow-test]]"
  - mold: "[[validate-galaxy-workflow]]"
  - mold: "[[run-workflow-test]]"
  - mold: "[[debug-galaxy-workflow-output]]"
---

# NEXTFLOW → GALAXY

Direct path. Lifted from `docs/HARNESS_PIPELINES.md` §"NEXTFLOW → GALAXY".

Replaces the prior-art hand-authored `nf-to-galaxy` skill — same goal, decomposed into Molds, validation-driven (gxwf static schema replaces the prose caveat catalog).
