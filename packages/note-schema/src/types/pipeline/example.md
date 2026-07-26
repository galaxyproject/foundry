---
type: pipeline
title: CWL workflow to Galaxy
tags:
  - target/galaxy
status: draft
created: 2026-07-26
revised: 2026-07-26
revision: 1
ai_generated: true
summary: Summarize a CWL workflow, choose the interface strategy, then build and validate the Galaxy workflow.
phases:
  - mold: "[[summarize-cwl-workflow]]"
  - branch: Does every step map to an installed Galaxy tool?
    branches:
      - "[[cwl-summary-to-galaxy-interface]]"
      - fallthrough: "[[freeform-summary-to-galaxy-interface]]"
  - mold: "[[validate-galaxy-workflow]]"
    loop: true
harness_notes:
  - The final phase loops until validation passes; cap the attempts and surface the last error.
---

# CWL workflow to Galaxy

Three phases, one of them a branch and one of them a loop — the whole grammar, and no
restatement of what any Mold does.
