---
type: pipeline
title: INTERVIEW → GALAXY
tags:
  - source/interview
  - target/galaxy
  - journey/direct-build
status: reviewed
created: 2026-05-22
revised: 2026-10-21
revision: 6
summary: "Interview-driven path to a Galaxy gxformat2 workflow. Writes a Workflow Brief internally and builds from it with no expert review stop."
harness_notes:
  - 'v1 "workflow" means a Galaxy `gxformat2` workflow. The live interview mechanics are harness-owned and precede phase 1.'
  - "The interview supplies the desired objective and selected scope. Ambiguous selection becomes a Workflow blocker rather than an agent choice."
  - "After phase 2, run `foundry validate-workflow-brief workflow-brief.md` and `foundry check-workflow-brief workflow-brief.md --json`, and run the check again whenever resuming. A failed validation or check exit 1, 3, or 4 stops before design, with the brief reported as an honest blocked result."
  - "This route has no expert review. Record in the run record that workflow-brief.md went to design with no expert review and its proposals accepted by default. Before phase 3, perform current environment preflight for required tooling, versions, workspace access, and usable container engines. Failed preflight stops the run."
  - "Treat workflow-brief.md as unchanged from the end of phase 2 through every later phase. Record its hash when phase 2 finishes and check it after each phase and loop iteration and on resumption. A mismatch stops the run."
  - "Record durable workflow knowledge in open-requirements.ledger.yml. Because no expert reviewed the brief, the interface Mold records each open question it adopts from a proposal with `basis: unreviewed-proposal`. A later Mold that finds one wrong supersedes it with its own decision and keeps going. A change to the brief's objective, scope, or requirements is still a proposed brief-change recommendation, and the run stops when correctness depends on it."
  - "The brief governs scientific scope. Keep freeform-summary.md and the interview record available. Design Molds may consult them as evidence, and they never broaden scope."
  - "Phase 8 resolves test data with find-test-data, then caller-supplied fixtures."
  - "When reporting at Done, list every Workflow Brief open question recorded in open-requirements.ledger.yml with the answer the run used and its basis, low-confidence answers first, followed by every proposed brief-change recommendation. Tell the user these answers were never reviewed. To change one, they edit workflow-brief.md, review it, and rerun from the brief with `pipeline-workflow-brief-to-galaxy`."
phases:
  - mold: "[[interview-to-freeform-summary]]"
  - mold: "[[freeform-summary-to-workflow-brief]]"
  - mold: "[[workflow-brief-to-galaxy-interface]]"
  - mold: "[[workflow-brief-to-galaxy-data-flow]]"
  - mold: "[[compare-against-iwc-exemplar]]"
  - mold: "[[workflow-brief-to-galaxy-template]]"
  - mold: "[[advance-galaxy-draft-step]]"
    loop: true
  - branch: test-data-resolution
    chain:
      - "[[find-test-data]]"
      - user-supplied
  - mold: "[[workflow-brief-to-galaxy-test-plan]]"
  - mold: "[[implement-galaxy-workflow-test]]"
  - mold: "[[validate-galaxy-workflow]]"
  - mold: "[[run-workflow-test]]"
  - mold: "[[debug-galaxy-workflow-output]]"
---

# INTERVIEW → GALAXY

Direct build from an interview. The live interview mechanics are harness-owned. [[interview-to-freeform-summary]] normalizes the interview into the `freeform-summary` handoff, [[freeform-summary-to-workflow-brief]] turns that into a Workflow Brief, and the run continues straight into the same Galaxy design chain as [[workflow-brief-to-galaxy]]. Nobody reviews the brief. Its proposed answers to open questions are taken as the answers, and the run reports them at the end. Use [[interview-to-workflow-brief]] followed by [[workflow-brief-to-galaxy]] instead when an expert should edit and approve the brief before any design.

For v1, "workflow" means a Galaxy `gxformat2` workflow because Galaxy is the Foundry's primary target. If interview-sourced CWL becomes a first-class path, add an `interview-to-cwl` pipeline that reuses [[interview-to-freeform-summary]] and [[freeform-summary-to-cwl-design]].
