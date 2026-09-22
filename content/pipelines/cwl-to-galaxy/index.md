---
type: pipeline
title: CWL → GALAXY
tags:
  - source/cwl
  - target/galaxy
status: draft
created: 2026-04-30
revised: 2026-09-22
revision: 4
summary: "Translate a CWL Workflow into a Galaxy gxformat2 workflow, then assemble and run a Galaxy workflow test."
phases:
  - mold: "[[summarize-cwl]]"
  - mold: "[[cwl-summary-to-galaxy-interface]]"
  - mold: "[[cwl-summary-to-galaxy-data-flow]]"
  - mold: "[[compare-against-iwc-exemplar]]"
  - mold: "[[cwl-summary-to-galaxy-template]]"
  - mold: "[[advance-galaxy-draft-step]]"
    loop: true
  - branch: test-data-resolution
    chain:
      - "[[cwl-to-test-data]]"
      - "[[find-test-data]]"
      - user-supplied
  - mold: "[[cwl-test-to-galaxy-test-plan]]"
  - mold: "[[implement-galaxy-workflow-test]]"
  - mold: "[[validate-galaxy-workflow]]"
  - mold: "[[run-workflow-test]]"
  - mold: "[[debug-galaxy-workflow-output]]"
---

# CWL → GALAXY

Start with a CWL `Workflow` entrypoint and its referenced tools, supplied as a local path or HTTP(S) URL. Include available CWL job files and expected outputs so the Galaxy test can carry forward source test evidence. This path also accepts CWL produced by a paper-to-CWL or Nextflow-to-CWL run.

Follow the declared phases in order. Review the Galaxy interface and data-flow briefs before accepting the draft topology. Run [[advance-galaxy-draft-step]] until no drafty step remains, and resolve recorded gaps instead of guessing tool details. For test inputs, try the CWL source cases first, then search for suitable fixtures, then request user-supplied data if needed.

Check the concrete `galaxy-workflow.gxwf.yml`, its `galaxy-workflow.gxwf-tests.yml` companion, and `workflow-test-result.json`. Use the validation and debug phases to address reported failures. If the result is `test-definition-missing` or `not-run`, report the gap with the workflow instead of marking the translation verified.
