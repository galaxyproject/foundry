---
type: pipeline
title: PAPER → GALAXY
tags:
  - source/paper
  - target/galaxy
status: draft
created: 2026-04-30
revised: 2026-09-20
revision: 3
summary: "Direct path from paper evidence through a reviewed Workflow Brief to a Galaxy gxformat2 workflow."
harness_notes:
  - "The composed alternative PAPER → CWL → GALAXY is a runtime composition of `pipeline-paper-to-cwl` followed by `pipeline-cwl-to-galaxy`."
  - "After brief production and before Galaxy design, stop for expert editing/review, run the static blocker check, and perform current environment preflight. A missing review, declared blocker, or failed preflight stops the run."
  - "Retain the freeform summary as source evidence. The reviewed Workflow Brief is authoritative and remains byte-for-byte unchanged through implementation."
phases:
  - mold: "[[summarize-paper]]"
  - mold: "[[freeform-summary-to-workflow-brief]]"
  - mold: "[[workflow-brief-to-galaxy-interface]]"
  - mold: "[[workflow-brief-to-galaxy-data-flow]]"
  - mold: "[[compare-against-iwc-exemplar]]"
  - mold: "[[workflow-brief-to-galaxy-template]]"
  - mold: "[[advance-galaxy-draft-step]]"
    loop: true
  - branch: test-data-resolution
    chain:
      - "[[paper-to-test-data]]"
      - "[[find-test-data]]"
      - user-supplied
  - mold: "[[workflow-brief-to-galaxy-test-plan]]"
  - mold: "[[implement-galaxy-workflow-test]]"
  - mold: "[[validate-galaxy-workflow]]"
  - mold: "[[run-workflow-test]]"
  - mold: "[[debug-galaxy-workflow-output]]"
---

# PAPER → GALAXY

Direct path. `summarize-paper` preserves the paper as a source-evidence dossier; [[freeform-summary-to-workflow-brief]] turns selected intent into the implementation contract. The harness pauses for expert editing and review before the common Workflow-Brief-to-Galaxy spine begins. Downstream design Molds consume the reviewed brief directly and consult the freeform summary only for supporting evidence.

The composed alternative `PAPER → CWL → GALAXY` is a runtime composition of `paper-to-cwl` followed by `cwl-to-galaxy` — open question whether to surface as a distinct pipeline note.
