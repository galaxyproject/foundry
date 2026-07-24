---
type: pipeline
title: INTERVIEW → GALAXY
tags:
  - source/interview
  - target/galaxy
status: reviewed
created: 2026-05-22
revised: 2026-07-24
revision: 2
ai_generated: true
summary: "Interview-driven path to a Galaxy gxformat2 workflow through the shared freeform-summary handoff."
harness_notes:
  - 'v1 "workflow" means a Galaxy `gxformat2` workflow; the live interview mechanics are harness-owned and precede phase 1.'
phases:
  - mold: "[[interview-to-freeform-summary]]"
  - mold: "[[freeform-summary-to-galaxy-interface]]"
  - mold: "[[freeform-summary-to-galaxy-data-flow]]"
  - mold: "[[compare-against-iwc-exemplar]]"
  - mold: "[[freeform-summary-to-galaxy-template]]"
  - mold: "[[advance-galaxy-draft-step]]"
    loop: true
  - branch: test-data-resolution
    chain:
      - "[[find-test-data]]"
      - user-supplied
  - mold: "[[freeform-summary-to-galaxy-test-plan]]"
  - mold: "[[implement-galaxy-workflow-test]]"
  - mold: "[[validate-galaxy-workflow]]"
  - mold: "[[run-workflow-test]]"
  - mold: "[[debug-galaxy-workflow-output]]"
---

# INTERVIEW → GALAXY

Interview-driven Galaxy workflow path. The live interview mechanics are harness-owned; this pipeline records the Mold spine after an interview has been normalized into the shared `freeform-summary` handoff.

For v1, "workflow" means a Galaxy `gxformat2` workflow because Galaxy is the Foundry's primary target. If interview-sourced CWL becomes a first-class path, add an `interview-to-cwl` pipeline that reuses [[interview-to-freeform-summary]] and [[freeform-summary-to-cwl-design]].
