---
type: pipeline
title: WORKFLOW BRIEF → GALAXY
tags:
  - target/galaxy
status: draft
created: '2026-09-17'
revised: '2026-09-20'
revision: 3
summary: Consume an expert-reviewed, unchanged Workflow Brief directly through the Galaxy design and implementation chain.
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
  - The selected brief governs scientific scope. Design Molds consume it directly and may consult retained
    freeform or Nextflow summaries only as source evidence; linked evidence does not broaden scope.
  - Phase 6 resolves test data with find-test-data then caller-supplied fixtures. Phase 7 develops the
    test plan; the brief itself never contains final fixture/assertion declarations.
phases:
  - mold: '[[workflow-brief-to-galaxy-interface]]'
  - mold: '[[workflow-brief-to-galaxy-data-flow]]'
  - mold: '[[compare-against-iwc-exemplar]]'
  - mold: '[[workflow-brief-to-galaxy-template]]'
  - mold: '[[advance-galaxy-draft-step]]'
    loop: true
  - branch: test-data-resolution
    chain:
      - '[[find-test-data]]'
      - user-supplied
  - mold: '[[workflow-brief-to-galaxy-test-plan]]'
  - mold: '[[implement-galaxy-workflow-test]]'
  - mold: '[[validate-galaxy-workflow]]'
  - mold: '[[run-workflow-test]]'
  - mold: '[[debug-galaxy-workflow-output]]'
---

# WORKFLOW BRIEF → GALAXY

A reviewed brief is the entry point, including a hand-authored brief. The harness checks declared blockers, review, and current environment readiness before any design. Galaxy design Molds consume the brief directly; a retained source summary remains optional evidence rather than an intermediate authority.

The input brief remains unchanged. `open-requirements.ledger.yml` records durable workflow discoveries, decisions, obligations, and proposed brief changes; ordinary phase progress remains harness state. Only a separate expert editing step can change scope or requirements. A required brief change stops implementation and returns to that editing step.

Source-to-brief journeys remain independently usable so they can finish with an honest blocked draft. The paper and interview direct journeys compose brief production, an inline expert-review gate, and this same brief-driven implementation spine. This initial implementation route does not yet dispatch to the specialized Nextflow reference-data and test-translation chain.
