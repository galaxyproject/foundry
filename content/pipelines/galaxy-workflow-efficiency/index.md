---
type: pipeline
title: GALAXY WORKFLOW EFFICIENCY
tags:
  - source/galaxy
  - target/galaxy
  - lifecycle/efficiency
  - journey/existing-workflow
status: draft
created: 2026-11-12
revised: 2026-11-12
revision: 1
summary: "Propose documented efficiency edits to an existing Galaxy workflow as a change-set, then apply, implement, and retest the result."
harness_notes:
  - "Entry is an existing workflow: a `.gxwf.yml` or `.ga` file, including one a construction pipeline just emitted. Phase 1 normalizes `.ga` to gxformat2, and every later judgement is stated against that normalized baseline."
  - "Show the phase-2 change-set to a person and wait for approval before phase 3. The person may strike entries; the harness passes on only the approved ones. An approved change-set that still names an unsettled condition, such as an undeclared input format, means the person settled it."
  - "A change-set with no entries ends the run after phase 2. Report the levers consulted and the steps kept, and do not run the remaining phases on an unchanged workflow."
  - "Only `replace-tool` entries make the phase-4 loop run. It resolves each replacement's version and changeset from the identity the change-set pinned; it does not search for the replacement by name."
  - "Tests: the existing workflow's `*-tests.yml`, captured in the phase-1 summary, is the regression baseline. [[changeset-to-galaxy-test-plan]] carries it forward and replaces the assertions each change-set entry names as broken by the swap. A run that passes only after loosening other assertions has changed what the workflow computes, and is a failed run."
  - "A red phase 7 or phase 8 is retained evidence. Report it beside the change-set entry most likely to have caused it, and let the person strike that entry and rerun, or invoke [[debug-galaxy-workflow-output]]."
phases:
  - mold: "[[summarize-galaxy-workflow]]"
  - mold: "[[improve-galaxy-workflow-efficiency]]"
  - mold: "[[apply-galaxy-workflow-changeset]]"
  - mold: "[[advance-galaxy-draft-step]]"
    loop: true
  - mold: "[[changeset-to-galaxy-test-plan]]"
  - mold: "[[implement-galaxy-workflow-test]]"
  - mold: "[[validate-galaxy-workflow]]"
  - mold: "[[run-workflow-test]]"
  - mold: "[[debug-galaxy-workflow-output]]"
related_notes:
  - "[[galaxy-efficient-tool-substitutions]]"
  - "[[open-requirements-ledger]]"
---

# GALAXY WORKFLOW EFFICIENCY

An existing Galaxy workflow enters, the efficiency levers the Foundry documents are checked against it, and the approved edits are applied, implemented, and retested. The workflow is both the input and the output. A cheaper step saves compute on every Galaxy server that runs the workflow, once per sample in every invocation, so the pipeline targets workflows that are about to be published or are already widely run.

**Why a change-set, not a direct edit.** Each lever has exceptions. FastQC → Falco, the first one, has opt-outs for input formats, settings, and downstream steps that parse the report. [[improve-galaxy-workflow-efficiency]] checks those against the workflow summary, but some can only be settled by a person who knows the data. A change-set puts every proposed swap, and every step kept with its reason, in front of that person before anything changes. It also reuses the edit machinery of `UPDATE-INTERVIEW → GALAXY` unchanged. From phase 3 on, the two pipelines are identical.

**Why the tests run afterwards.** A substitution is only correct if the workflow still computes the same thing. Carrying the existing tests forward, and changing only the assertions the lever's note says the replacement breaks, is how the run shows that.

**What it deliberately does not do.** No changes beyond the documented levers: no version bumps, no restructuring, no tidying. Adding a lever means adding to its reference note, not widening this journey.
