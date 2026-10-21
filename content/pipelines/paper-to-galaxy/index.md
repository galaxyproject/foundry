---
type: pipeline
title: PAPER → GALAXY
tags:
  - source/paper
  - target/galaxy
  - journey/direct-build
status: draft
created: 2026-04-30
revised: 2026-10-21
revision: 7
summary: "Direct path from a paper to a Galaxy gxformat2 workflow. Writes a Workflow Brief internally and builds from it with no expert review stop."
harness_notes:
  - "The composed alternative PAPER → CWL → GALAXY is a runtime composition of `pipeline-paper-to-cwl` followed by `pipeline-cwl-to-galaxy`."
  - "The caller supplies the desired objective and selected scope. Ambiguous selection becomes a Workflow blocker rather than an agent choice."
  - "After phase 2, run `foundry validate-workflow-brief workflow-brief.md` and `foundry check-workflow-brief workflow-brief.md --json`, and run the check again whenever resuming. A failed validation or check exit 1, 3, or 4 stops before design, with the brief reported as an honest blocked result."
  - "This route has no expert review. Record in the run record that workflow-brief.md went to design with no expert review and its proposals accepted by default. Before phase 3, perform current environment preflight for required tooling, versions, workspace access, and usable container engines. Failed preflight stops the run."
  - "Treat workflow-brief.md as unchanged from the end of phase 2 through every later phase. Record its hash when phase 2 finishes and check it after each phase and loop iteration and on resumption. A mismatch stops the run."
  - "Record durable workflow knowledge in open-requirements.ledger.yml. Because no expert reviewed the brief, the interface Mold records each open question it adopts from a proposal with `basis: unreviewed-proposal`. A later Mold that finds one wrong supersedes it with its own decision and keeps going. A change to the brief's objective, scope, or requirements is still a proposed brief-change recommendation, and the run stops when correctness depends on it."
  - "The brief governs scientific scope. Keep freeform-summary.md and the paper's source evidence available. Design Molds may consult them as evidence, and they never broaden scope."
  - "Phase 8 resolves test data with paper-to-test-data, then find-test-data, then caller-supplied fixtures."
  - "When reporting at Done, list every Workflow Brief open question recorded in open-requirements.ledger.yml with the answer the run used and its basis, low-confidence answers first, followed by every proposed brief-change recommendation. Tell the user these answers were never reviewed. To change one, they edit workflow-brief.md, review it, and rerun from the brief with `pipeline-workflow-brief-to-galaxy`."
phases:
  - mold: "[[summarize-paper]]"
  - mold: "[[freeform-summary-to-workflow-brief]]"
  - mold: "[[workflow-brief-to-galaxy-interface]]"
  - mold: "[[workflow-brief-to-galaxy-data-flow]]"
  - mold: "[[compare-against-iwc-exemplar]]"
  - mold: "[[workflow-brief-to-galaxy-template]]"
  - mold: "[[advance-galaxy-draft-step]]"
    loop: true
  - branch: test-data-resolution
    chain:
      - "[[paper-to-test-data]]"
      - "[[find-test-data]]"
      - user-supplied
  - mold: "[[workflow-brief-to-galaxy-test-plan]]"
  - mold: "[[implement-galaxy-workflow-test]]"
  - mold: "[[validate-galaxy-workflow]]"
  - mold: "[[run-workflow-test]]"
  - mold: "[[debug-galaxy-workflow-output]]"
---

# PAPER → GALAXY

Direct build from a paper. `summarize-paper` emits the `freeform-summary` handoff, [[freeform-summary-to-workflow-brief]] turns it into a Workflow Brief, and the run continues straight into the same Galaxy design chain as [[workflow-brief-to-galaxy]]. Nobody reviews the brief. Its proposed answers to open questions are taken as the answers, and the run reports them at the end. Use [[paper-to-workflow-brief]] followed by [[workflow-brief-to-galaxy]] instead when an expert should edit and approve the brief before any design.

Start with a methods or tool paper and a statement of the analysis you want. Include available supplementary methods, linked code, sample and reference data, and reported results that identify the workflow's steps, parameters, inputs, and outputs. Point to concrete test inputs and expected values when the publication provides them. A selection the brief producer cannot resolve becomes a blocker and stops the run before design, so name the scope plainly.

Review the Galaxy interface and data-flow briefs against the paper before accepting the draft topology. Check input and output labels, collection shapes, step dependencies, and the IWC comparison notes. Resolve tool details from an acceptable wrapper during the draft loop, and bring an uncomputable step back to topology repair instead of guessing its missing input.

For workflow tests, use paper-derived data and expected outputs where they are resolvable. If they are not, check suitable IWC or public fixtures, then supply the missing data yourself. Review `galaxy-test-plan.yml` for assumed labels, fixture provenance, assertions, and omissions before inspecting the assembled `galaxy-workflow.gxwf-tests.yml`.

Inspect `galaxy-workflow.gxwf.yml`, `galaxy-workflow-validation-result.json`, and `workflow-test-result.json`. Use the debug report to investigate a failing run. Treat `test-definition-missing` or `not-run` as missing runtime evidence, and report unresolved source or test gaps with the workflow. The Done report's list of unreviewed answers is the place to start checking the result. `workflow-brief.md` stays in the run, so rerunning from an edited brief reuses the paper work.
