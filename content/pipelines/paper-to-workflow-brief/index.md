---
type: pipeline
title: PAPER → WORKFLOW BRIEF
tags:
  - source/paper
  - journey/plan
status: draft
created: '2026-09-17'
revised: '2026-10-19'
revision: 3
summary: Summarize a paper source and produce a scoped Workflow Brief for expert review.
harness_notes:
  - Brief production ends with workflow-brief.md for expert editing and review; it does not continue into
    Galaxy design or implementation.
  - The caller supplies the desired objective and selected scope. Ambiguous selection becomes a Workflow
    blocker rather than an agent choice.
  - Retain source evidence and run both structural validation and the static blocker check on the emitted
    brief. A valid blocked brief is an honest production result, not permission to implement.
  - When reporting at Done, list the brief's open questions with their proposed answers, low-confidence
    proposals first. Tell the expert that leaving a proposal unedited accepts it and editing the answer
    overrides it.
phases:
  - mold: '[[summarize-paper]]'
  - mold: '[[freeform-summary-to-workflow-brief]]'
---

# PAPER → WORKFLOW BRIEF

A brief-production journey. The caller identifies the intended scientific scope; the source summarizer preserves evidence, and the brief producer captures intent and the agent environment without inventing Galaxy design choices.

Review and editing happen before the separate [[workflow-brief-to-galaxy]] journey. A brief with explicit blockers is a useful output for that review.
