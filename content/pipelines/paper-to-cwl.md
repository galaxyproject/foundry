---
type: pipeline
title: PAPER → CWL
tags:
  - pipeline
  - source/paper
  - target/cwl
status: draft
created: 2026-04-30
revised: 2026-04-30
revision: 2
ai_generated: true
summary: "Direct path from a paper to a CWL Workflow + CommandLineTool set."
harness_notes:
  - "CWL targeting has no `discover-or-author` branch — CommandLineTool authoring is built into `implement-cwl-tool-step`, informed by `summarize-cwl-tool`."
phases:
  - mold: "[[summarize-paper]]"
  - mold: "[[freeform-summary-to-cwl-design]]"
  - mold: "[[summary-to-cwl-template]]"
  - mold: "[[summarize-cwl-tool]]"
    loop: true
  - mold: "[[implement-cwl-tool-step]]"
    loop: true
  - mold: "[[validate-cwl]]"
    loop: true
  - branch: test-data-resolution
    chain:
      - "[[paper-to-test-data]]"
      - "[[find-test-data]]"
      - user-supplied
  - mold: "[[implement-cwl-workflow-test]]"
  - mold: "[[validate-cwl]]"
  - mold: "[[run-workflow-test]]"
  - mold: "[[debug-cwl-workflow-output]]"
---

# PAPER → CWL

Direct path. Lifted from `docs/HARNESS_PIPELINES.md` §"PAPER → CWL".

CWL targeting has no `discover-or-author` branch — wrappers aren't a separate concern; CommandLineTool authoring is built into the per-step Mold (`implement-cwl-tool-step`) and is informed by `summarize-cwl-tool`.

`summarize-paper` now emits the shared `freeform-summary` handoff, so the design phase is shared with future interview-sourced CWL starts.
