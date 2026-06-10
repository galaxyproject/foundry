---
type: pipeline
title: PAPER → GALAXY
tags:
  - pipeline
  - source/paper
  - target/galaxy
status: draft
created: 2026-04-30
revised: 2026-04-30
revision: 2
ai_generated: true
summary: "Direct path from a paper to a Galaxy gxformat2 workflow. No CWL intermediate."
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
  - mold: "[[implement-galaxy-workflow-test]]"
  - mold: "[[validate-galaxy-workflow]]"
  - mold: "[[run-workflow-test]]"
  - mold: "[[debug-galaxy-workflow-output]]"
---

# PAPER → GALAXY

Direct path. Lifted from `docs/HARNESS_PIPELINES.md` §"PAPER → GALAXY".

`summarize-paper` now emits the shared `freeform-summary` handoff, so the interface, data-flow, and template phases are shared with interview-sourced starts.

The composed alternative `PAPER → CWL → GALAXY` is a runtime composition of `paper-to-cwl` followed by `cwl-to-galaxy` — open question whether to surface as a distinct pipeline note.
