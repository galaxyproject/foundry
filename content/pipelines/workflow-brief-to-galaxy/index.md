---
type: pipeline
title: WORKFLOW BRIEF → GALAXY
tags:
  - target/galaxy
status: draft
created: '2026-09-17'
revised: '2026-09-20'
revision: 2
summary: Consume an expert-reviewed, unchanged Workflow Brief through readiness checks and the existing
  Galaxy design and implementation chain.
harness_notes:
  - The caller supplies workflow-brief.md; a hand-authored brief is a valid entry and requires no source-to-brief
    producer run. Keep referenced source evidence available, preserving originals at separate paths.
  - Before phase 1, record expert review of the supplied brief and perform current environment preflight
    for required tooling, versions, workspace access, and usable container engines. Missing review or
    failed preflight stops the run.
  - Before phase 1 and whenever resuming, run foundry check-workflow-brief workflow-brief.md --json. Exit
    1, 3, or 4 stops before design; exit 0 establishes only structure and no declared blockers.
  - Treat workflow-brief.md as unchanged input through every design, draft, implementation, test, and
    debug phase. Record its initial hash and check it after each phase and loop iteration and on resumption; a mismatch stops
    the run.
  - >-
    Record durable workflow knowledge in open-requirements.ledger.yml: evidence as discoveries, authorized
    choices as decisions, unmet needs as obligations, and changes to expert intent as proposed brief-change
    recommendations. Harness progress remains harness state. Do not apply a recommendation to the brief;
    return a required change to the separate expert editing step.
  - The selected brief governs scientific scope. Reuse the existing freeform Galaxy design and implementation
    chain after projection; links to Nextflow evidence do not require porting every source process.
  - Phase 7 resolves test data with find-test-data then caller-supplied fixtures. Phase 8 develops the
    test plan; the brief itself never contains final fixture/assertion declarations.
phases:
  - mold: '[[workflow-brief-to-freeform-summary]]'
  - mold: '[[freeform-summary-to-galaxy-interface]]'
  - mold: '[[freeform-summary-to-galaxy-data-flow]]'
  - mold: '[[compare-against-iwc-exemplar]]'
  - mold: '[[freeform-summary-to-galaxy-template]]'
  - mold: '[[advance-galaxy-draft-step]]'
    loop: true
  - branch: test-data-resolution
    chain:
      - '[[find-test-data]]'
      - user-supplied
  - mold: '[[freeform-summary-to-galaxy-test-plan]]'
  - mold: '[[implement-galaxy-workflow-test]]'
  - mold: '[[validate-galaxy-workflow]]'
  - mold: '[[run-workflow-test]]'
  - mold: '[[debug-galaxy-workflow-output]]'
---

# WORKFLOW BRIEF → GALAXY

A reviewed brief is the entry point, including a hand-authored brief. The harness checks declared blockers, review, and current environment readiness before any design. The first Mold projects selected scientific intent into the existing freeform handoff; subsequent Molds design, draft, implement, and test the Galaxy workflow.

The input brief remains unchanged. `open-requirements.ledger.yml` records durable workflow discoveries, decisions, obligations, and proposed brief changes; ordinary phase progress remains harness state. Only a separate expert editing step can change scope or requirements. A required brief change stops implementation and returns to that editing step.

Source-to-brief journeys are separate so they can finish with an honest blocked draft and let an expert edit it before implementation. This initial implementation route normalizes linked source evidence into the shared freeform path; it does not yet dispatch to the specialized Nextflow reference-data and test-translation chain.
