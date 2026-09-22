---
type: pipeline
title: CWL → GALAXY
tags:
  - source/cwl
  - target/galaxy
status: draft
created: 2026-04-30
revised: 2026-09-22
revision: 3
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

CWL → GALAXY starts with a CWL `Workflow` and its referenced tools. It produces a concrete Galaxy gxformat2 workflow and a companion workflow test, then validates the workflow and runs the test through Planemo. It can also serve as the second half of a composed paper or Nextflow path that first produces CWL. The direct paper and Nextflow paths have their own pipelines.

The input can be a local CWL entrypoint or an HTTP(S) URL. Supply any available CWL job files and expected outputs as test evidence. The [[summarize-cwl]] phase validates the entrypoint, resolves referenced workflow and tool documents, and writes `summary-cwl.json`. Unlike a Nextflow source, CWL already declares inputs, outputs, step connections, scatter, and requirements. The summary preserves that structure and flags expressions or unresolved references that need later judgment. If no tests are supplied or discovered, its `tests[]` is empty.

## From CWL structure to a Galaxy workflow

The [[cwl-summary-to-galaxy-interface]] and [[cwl-summary-to-galaxy-data-flow]] phases turn the summary into reviewable Galaxy interface and data-flow briefs. They choose input and output labels, datatypes, collection shapes, and Galaxy operations. In particular, CWL scatter, `linkMerge`, `pickValue`, `valueFrom`, and `when` may require explicit Galaxy choices or recorded placeholders. [[compare-against-iwc-exemplar]] checks those briefs against a nearby IWC workflow when one can be found, so the template phase has a concrete Galaxy pattern to consult.

[[cwl-summary-to-galaxy-template]] then writes `galaxy-workflow-draft.gxwf.yml`. It settles the workflow topology—inputs, outputs, steps, and connections—while leaving wrapper details in planned steps where evidence is insufficient. [[advance-galaxy-draft-step]] runs once per drafty step. Each call selects a step, resolves or authors a Galaxy tool wrapper when needed, implements the step, and validates the growing concrete workflow. When no drafty step remains, it extracts `galaxy-workflow.gxwf.yml`. A blocking output that cannot be computed from its wired inputs requires topology repair or an explicit surrendered obligation. Passing structural validation alone cannot prove that output is computable.

## Test data, checks, and result

The harness first tries [[cwl-to-test-data]] to map declared CWL job inputs onto the Galaxy interface. For inputs it cannot resolve, it tries [[find-test-data]] against IWC fixtures and public sources, then asks for user-supplied data. It does not invent missing fixtures. [[cwl-test-to-galaxy-test-plan]] translates available CWL test evidence into the reviewable `galaxy-test-plan.yml`. [[implement-galaxy-workflow-test]] combines that plan, resolved data, and the concrete workflow into `galaxy-workflow.gxwf-tests.yml`, checking its schema and workflow labels.

[[validate-galaxy-workflow]] performs a terminal gxwf check on the assembled workflow. [[run-workflow-test]] runs the companion test with Planemo, using a Planemo-managed Galaxy by default, and records the result in `workflow-test-result.json`. [[debug-galaxy-workflow-output]] uses failure evidence to classify what needs repair. A static check does not establish that tools install or that expected outputs match. If the test is missing or cannot run, the result records that state instead of reporting a pass. Inspect the workflow, test file, result, and any unresolved assumptions before treating the translation as complete. This pipeline is still marked draft and has no pipeline-level evaluation plan or end-to-end scenarios.

The ordered phase list above is the pipeline contract. The generated `pipeline-cwl-to-galaxy` harness sequences these skills in a per-run directory and handles the test-data fallback. See [[harness-pipelines]] for the orchestration boundary and the direct versus composed path choice.
