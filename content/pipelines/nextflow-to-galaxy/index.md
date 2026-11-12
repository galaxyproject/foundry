---
type: pipeline
title: NEXTFLOW → GALAXY
tags:
  - source/nextflow
  - target/galaxy
  - journey/direct-build
status: reviewed
created: 2026-04-30
revised: 2026-11-12
revision: 6
summary: "Direct path from a Nextflow pipeline to a Galaxy gxformat2 workflow."
harness_notes:
  - "Replaces the prior-art hand-authored `nf-to-galaxy` skill — same goal, decomposed into Molds, validation-driven."
  - "The parity report runs once after the test phase settles, whether the test passed or not. It only reports and never sends the run back into the test loop."
phases:
  - mold: "[[summarize-nextflow]]"
  - mold: "[[nextflow-summary-to-galaxy-reference-data]]"
  - mold: "[[nextflow-summary-to-galaxy-interface]]"
  - mold: "[[nextflow-summary-to-galaxy-data-flow]]"
  - mold: "[[compare-against-iwc-exemplar]]"
  - mold: "[[nextflow-summary-to-galaxy-template]]"
  - mold: "[[advance-galaxy-draft-step]]"
    loop: true
  - branch: test-data-resolution
    chain:
      - "[[nextflow-to-test-data]]"
      - "[[find-test-data]]"
      - user-supplied
  - mold: "[[nextflow-test-to-galaxy-test-plan]]"
  - mold: "[[implement-galaxy-workflow-test]]"
  - mold: "[[validate-galaxy-workflow]]"
  - mold: "[[run-workflow-test]]"
  - mold: "[[debug-galaxy-workflow-output]]"
  - mold: "[[nextflow-summary-to-galaxy-parity]]"
---

# NEXTFLOW → GALAXY

Replaces the prior-art hand-authored `nf-to-galaxy` skill — same goal, decomposed into Molds, validation-driven (gxwf static schema replaces the prose caveat catalog).
