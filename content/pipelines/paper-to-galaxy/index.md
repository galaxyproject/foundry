---
type: pipeline
title: PAPER → GALAXY
tags:
  - source/paper
  - target/galaxy
status: draft
created: 2026-04-30
revised: 2026-09-22
revision: 4
summary: "Direct path from a paper to a Galaxy gxformat2 workflow. No Workflow Brief or CWL intermediate."
harness_notes:
  - "The composed alternative PAPER → CWL → GALAXY is a runtime composition of `pipeline-paper-to-cwl` followed by `pipeline-cwl-to-galaxy`."
phases:
  - mold: "[[summarize-paper]]"
  - mold: "[[freeform-summary-to-galaxy-interface]]"
  - mold: "[[freeform-summary-to-galaxy-data-flow]]"
  - mold: "[[compare-against-iwc-exemplar]]"
  - mold: "[[freeform-summary-to-galaxy-template]]"
  - mold: "[[advance-galaxy-draft-step]]"
    loop: true
  - branch: test-data-resolution
    chain:
      - "[[paper-to-test-data]]"
      - "[[find-test-data]]"
      - user-supplied
  - mold: "[[freeform-summary-to-galaxy-test-plan]]"
  - mold: "[[implement-galaxy-workflow-test]]"
  - mold: "[[validate-galaxy-workflow]]"
  - mold: "[[run-workflow-test]]"
  - mold: "[[debug-galaxy-workflow-output]]"
---

# PAPER → GALAXY

Direct path. `summarize-paper` emits the shared `freeform-summary` handoff, so the interface, data-flow, template, and test-plan phases are shared with interview-sourced starts. This route does not create or require a Workflow Brief; use [[paper-to-workflow-brief]] followed by [[workflow-brief-to-galaxy]] when an explicit planning and expert-review boundary is wanted.

The composed alternative `PAPER → CWL → GALAXY` is a runtime composition of `paper-to-cwl` followed by `cwl-to-galaxy` — open question whether to surface as a distinct pipeline note.
