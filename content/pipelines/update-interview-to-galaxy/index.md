---
type: pipeline
title: UPDATE-INTERVIEW → GALAXY
tags:
  - pipeline
  - source/interview
  - target/galaxy
status: reviewed
created: 2026-07-01
revised: 2026-07-24
revision: 2
ai_generated: true
summary: "Interview-driven, edit-in-place modification of an existing Galaxy gxformat2 workflow via a reviewable change-set, reusing the per-step draft loop."
harness_notes:
  - 'The workflow is both an input and the output — the Foundry''s first GALAXY → GALAXY (edit) pipeline. Untouched regions must stay byte-stable; only change-set targets change.'
  - 'The live interview mechanics are harness-owned and precede phase 2, exactly as in INTERVIEW → GALAXY.'
  - 'A `.ga` input is converted to gxformat2 inside phase 1 ([[summarize-galaxy-workflow]]); the modification is judged against the converted baseline.'
  - 'Only edits that introduce or replace a tool make the phase-4 loop run; a change-set of purely direct edits leaves the draft concrete (`draft: false`) and the loop is a no-op.'
  - 'Tests: the existing workflow''s `*-tests.yml` (captured in the phase-1 summary) is the regression baseline. [[changeset-to-galaxy-test-plan]] carries those cases forward and augments them for the change-set''s behavioral deltas, emitting the `galaxy-test-plan` that [[implement-galaxy-workflow-test]] authors into the final tests; [[run-workflow-test]] then runs them as the regression check. `test-data-refs` come from the baseline''s existing fixtures (or [[find-test-data]] when a change-set-added input needs new data).'
phases:
  - mold: "[[summarize-galaxy-workflow]]"
  - mold: "[[interview-to-galaxy-workflow-changeset]]"
  - mold: "[[apply-galaxy-workflow-changeset]]"
  - mold: "[[advance-galaxy-draft-step]]"
    loop: true
  - mold: "[[changeset-to-galaxy-test-plan]]"
  - mold: "[[implement-galaxy-workflow-test]]"
  - mold: "[[validate-galaxy-workflow]]"
  - mold: "[[run-workflow-test]]"
  - mold: "[[debug-galaxy-workflow-output]]"
---

# UPDATE-INTERVIEW → GALAXY

Interview-driven, **edit-in-place** modification of an existing Galaxy `gxformat2` workflow. Every other Foundry pipeline is greenfield — it generates a workflow from a non-Galaxy source. This one consumes a Galaxy workflow *already* and changes it: swap a tool, bump a version, add a step, retune a parameter, expose an output, rewire a connection. The workflow is both the input and the output.

## Approach: diff-and-patch

The existing workflow enters the pipeline already concrete. Phase 1 reads it into a structured [[summary-galaxy-workflow]] that anchors the interview. Phase 2 turns the interview into a reviewable, step-anchored change-set (the human approval gate). Phase 3 applies the change-set to the concrete workflow — direct edits inline, tool-introducing edits injected as **drafty steps** — and emits a `galaxy-workflow-draft`.

**An edit is a drafty region.** From phase 3 on, the pipeline reuses the greenfield machinery unchanged: [[advance-galaxy-draft-step]] drains any injected drafty steps and extracts the concrete workflow, then the test/validate/run/debug tail runs. Untouched steps ride through at Resolved tier, byte-stable.

This mirrors the greenfield altitude structure: the change-set plays the reviewable-brief role the interface/data-flow briefs play; [[apply-galaxy-workflow-changeset]] plays the topology-settling role the `*-to-galaxy-template` Molds play (both emit a draft).

## Why edit-in-place, not regenerate

Regenerating discards the existing structure, provenance, and tests. Diffing preserves them: untouched regions are unchanged, so the workflow's shipped tests are a *meaningful* regression baseline — the modified workflow must keep passing them except where an edit intentionally changes an output. That baseline is the distinctive advantage of this pipeline over "regenerate the whole thing."

## Relationship to other work

Phase 1 closes a known inventory gap ([[compare-against-iwc-exemplar]] previously lacked a structured view of the exemplar it diffs against, and the Foundry had no Galaxy-as-source summarizer). [[summarize-galaxy-workflow]] serves both.
