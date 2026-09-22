---
type: pipeline
title: INTERVIEW → GALAXY
tags:
  - source/interview
  - target/galaxy
status: draft
created: 2026-05-22
revised: 2026-09-20
revision: 3
summary: "Interview-driven path through a reviewed Workflow Brief to a Galaxy gxformat2 workflow."
harness_notes:
  - 'v1 "workflow" means a Galaxy `gxformat2` workflow; the live interview mechanics are harness-owned and precede phase 1.'
  - "After brief production and before Galaxy design, stop for expert editing/review, run the static blocker check, and perform current environment preflight. A missing review, declared blocker, or failed preflight stops the run."
  - "Retain the freeform summary as source evidence. The reviewed Workflow Brief is authoritative and remains byte-for-byte unchanged through implementation."
phases:
  - mold: "[[interview-to-freeform-summary]]"
  - mold: "[[freeform-summary-to-workflow-brief]]"
  - mold: "[[workflow-brief-to-galaxy-interface]]"
  - mold: "[[workflow-brief-to-galaxy-data-flow]]"
  - mold: "[[compare-against-iwc-exemplar]]"
  - mold: "[[workflow-brief-to-galaxy-template]]"
  - mold: "[[advance-galaxy-draft-step]]"
    loop: true
  - branch: test-data-resolution
    chain:
      - "[[find-test-data]]"
      - user-supplied
  - mold: "[[workflow-brief-to-galaxy-test-plan]]"
  - mold: "[[implement-galaxy-workflow-test]]"
  - mold: "[[validate-galaxy-workflow]]"
  - mold: "[[run-workflow-test]]"
  - mold: "[[debug-galaxy-workflow-output]]"
---

# INTERVIEW → GALAXY

Interview-driven Galaxy workflow path. The live interview mechanics are harness-owned. The normalized `freeform-summary` remains an evidence dossier, [[freeform-summary-to-workflow-brief]] produces the implementation contract, and the harness pauses for expert editing and review before Galaxy design. The common downstream Molds consume the reviewed brief directly.

For v1, "workflow" means a Galaxy `gxformat2` workflow because Galaxy is the Foundry's primary target. If interview-sourced CWL becomes a first-class path, add an `interview-to-cwl` pipeline that reuses [[interview-to-freeform-summary]] and [[freeform-summary-to-cwl-design]].
