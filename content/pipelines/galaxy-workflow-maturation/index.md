---
type: pipeline
title: GALAXY WORKFLOW MATURATION
tags:
  - source/galaxy
  - target/galaxy
  - lifecycle/publication
status: draft
created: 2026-09-12
revised: 2026-09-12
revision: 1
summary: "Apply the pinned IWC publication checklist to an existing Galaxy workflow, then validate and retest the matured result."
harness_notes:
  - "Entry is an existing workflow, not a construction run. The harness supplies a `.gxwf.yml` or `.ga` file; phase 1 normalizes `.ga` to gxformat2 and every checklist judgement downstream is stated against that normalized baseline."
  - "Phase 2's optional inputs have no producer in this pipeline. `galaxy-workflow-test`, `open-requirements-ledger`, `iwc-publication-context`, `iwc-workflow-readme`, `iwc-workflow-changelog`, and `iwc-dockstore-metadata` are supplied by the caller or carried in from a prior Foundry run. Absent is a normal result; the harness must not synthesize them."
  - "`iwc-maturation-report.md` is the run deliverable a human reads. Phases 3 and 4 add validation and Planemo evidence beside it; neither rewrites it."
  - "Phases 3 and 4 declare no input artifacts, so nothing in the artifact graph binds them to phase 2's output. The harness must hand phase 2's emitted workflow to phase 3 and its emitted test to phase 4 — that obligation lives here and in `eval.md`, not in a validator gate."
  - "A red phase 3 or phase 4 is retained evidence, not a reason to loosen the workflow or the test. Report the failure together with the phase-2 checklist items most likely to have caused it and stop; the user revises an ambiguous decision or invokes [[debug-galaxy-workflow-output]] and reruns."
  - "When the caller supplies a prior green `workflow-test-result`, compare the phase-4 result against it and name any regression explicitly. That comparison is a harness obligation — a prior result has no declared consumer in this spine. Without one, the phase-4 outcome becomes the baseline."
  - "This pipeline makes no GitHub writes and never claims the workflow has been accepted or published. Fork, branch, and IWC-Lab pull request are deferred follow-up."
phases:
  - mold: "[[summarize-galaxy-workflow]]"
  - mold: "[[mature-galaxy-workflow-for-iwc]]"
  - mold: "[[validate-galaxy-workflow]]"
  - mold: "[[run-workflow-test]]"
related_molds:
  - "[[debug-galaxy-workflow-output]]"
related_notes:
  - "[[open-requirements-ledger]]"
---

# GALAXY WORKFLOW MATURATION

An existing Galaxy workflow enters, the pinned IWC publication checklist is applied to it, and the matured result is validated and run before anyone looks at it.

**Why validate-then-run follows the checklist pass.** Checklist edits rename interface labels and can promote a hard-coded value into a real input — precisely the edits that break a test. Static validation catches structural damage cheaply; Planemo catches the rest. Running them *after* the checklist pass, rather than trusting it, is the point.

**What it deliberately does not do.** No autonomous remediation loop, no GitHub mutation, no publication claim, no bundle or manifest artifact. The checklist pass may leave a decision unresolved; surfacing it is a correct outcome, not a failure.

A note on naming, so the next reader does not "fix" it: the slug cannot be `mature-galaxy-workflow-for-iwc`. Wiki-link addressing is one flat namespace in which `pipelines` is registered after `molds`, so a pipeline of that name silently steals the Mold's address — `phases[1].mold` then resolves to `type=pipeline`, and `tests/wiki-addressing.test.ts` reports the Mold unreachable.
