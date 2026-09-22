---
type: pipeline
title: PAPER → GALAXY
tags:
  - source/paper
  - target/galaxy
status: draft
created: 2026-04-30
revised: 2026-09-22
revision: 3
summary: "Direct path from a paper to a Galaxy gxformat2 workflow. No CWL intermediate."
harness_notes:
  - "The composed alternative PAPER → CWL → GALAXY is a runtime composition of `pipeline-paper-to-cwl` followed by `pipeline-cwl-to-galaxy`."
phases:
  - mold: "[[summarize-paper]]"
  - mold: "[[freeform-summary-to-galaxy-interface]]"
  - mold: "[[freeform-summary-to-galaxy-data-flow]]"
  - mold: "[[compare-against-iwc-exemplar]]"
  - mold: "[[freeform-summary-to-galaxy-template]]"
  - mold: "[[advance-galaxy-draft-step]]"
    loop: true
  - branch: test-data-resolution
    chain:
      - "[[paper-to-test-data]]"
      - "[[find-test-data]]"
      - user-supplied
  - mold: "[[freeform-summary-to-galaxy-test-plan]]"
  - mold: "[[implement-galaxy-workflow-test]]"
  - mold: "[[validate-galaxy-workflow]]"
  - mold: "[[run-workflow-test]]"
  - mold: "[[debug-galaxy-workflow-output]]"
---

# PAPER → GALAXY

Start with a methods or tool paper. Include available supplementary methods, linked code, sample and reference data, and reported results that identify the workflow's steps, parameters, inputs, and outputs. Point to concrete test inputs and expected values when the publication provides them. Leave missing versions, data locations, and ambiguous operations explicit in the `freeform-summary.md` handoff.

Review the Galaxy interface and data-flow briefs against the paper before accepting the draft topology. Check input and output labels, collection shapes, step dependencies, and the IWC comparison notes. Track unsupported choices in the open-requirements ledger. Resolve tool details from an acceptable wrapper during the draft loop, and bring an uncomputable step back to topology repair instead of guessing its missing input.

For workflow tests, use paper-derived data and expected outputs where they are resolvable. If they are not, check suitable IWC or public fixtures, then supply the missing data yourself. Review `galaxy-test-plan.yml` for assumed labels, fixture provenance, assertions, and omissions before inspecting the assembled `galaxy-workflow.gxwf-tests.yml`.

Inspect `galaxy-workflow.gxwf.yml`, `galaxy-workflow-validation-result.json`, and `workflow-test-result.json`. Use the debug report to investigate a failing run. Treat `test-definition-missing` or `not-run` as missing runtime evidence, and report unresolved source or test gaps with the workflow.
