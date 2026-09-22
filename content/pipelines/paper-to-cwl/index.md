---
type: pipeline
title: PAPER → CWL
tags:
  - source/paper
  - target/cwl
status: draft
created: 2026-04-30
revised: 2026-09-22
revision: 3
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

Start with a methods or tool paper and available supplementary methods, code, tool documentation, sample data, and reported results. Record supported steps, parameters, file shapes, versions, and unknowns in `freeform-summary.md`. Leave missing commands or data locations unresolved rather than inventing them.

Review `freeform-cwl-design.md` and the workflow skeleton against the paper. For each placeholder step, confirm the executable or container, command, inputs, outputs, and version before implementing its `CommandLineTool`. Validate the updated CWL after each step and correct the responsible tool or connection when it fails. The CWL loop has no shared completion check, so inspect the draft for remaining placeholders.

Resolve test inputs from the paper first, then search for fixtures or request user-supplied data. Check any fixture against the CWL input ports. Before assembling `cwl-job.yml`, supply and review a `cwl-test-plan`: no declared phase produces this required input, and `test-data-refs.json` cannot replace it.

Inspect `cwl-workflow-draft.cwl` and its validation diagnostics. If a test runs, inspect `workflow-test-result.json` and use the CWL debug report to investigate a failure. Report unresolved source, test-plan, and data gaps with the workflow. A missing or unrun test provides no runtime confirmation.
