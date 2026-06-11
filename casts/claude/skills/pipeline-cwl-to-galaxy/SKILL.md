---
name: pipeline-cwl-to-galaxy
description: "Path from a CWL Workflow to a Galaxy gxformat2 workflow — orchestrates the Foundry skills of the CWL → GALAXY pipeline in order, in a per-run working directory."
---

# pipeline-cwl-to-galaxy

Harness for the **CWL → GALAXY** Foundry pipeline. Runs the constituent skills in order inside a single per-run working directory. Assembled from `content/pipelines/cwl-to-galaxy.md` (revision 2) — regenerate with `foundry-build assemble-pipeline cwl-to-galaxy` if the pipeline changes; do not hand-edit.

## When To Use

- Path from a CWL Workflow to a Galaxy gxformat2 workflow. Lighter upstream extraction.

## Working directory (do this first)

Every constituent skill writes fixed filenames to its working directory. To keep one run's artifacts namespaced and avoid clobbering a prior run (foundry#282):

1. Pick a run slug — use the harness argument if given; else ask the user for a short project name up front (the directory must exist before phase 1 writes its first artifact, so don't wait for a source title); else default `cwl-to-galaxy-run`.
2. Create `./<run-slug>/` in the current directory. If it exists, suffix `-2`, `-3`, … .
3. Run **every** skill invocation below with `./<run-slug>/` as its working directory: **prefix every default input and output filename with `./<run-slug>/`** when you invoke the skill. The skills preserve their declared basenames and honor a harness-supplied directory; you supply the prefix on **both reads and writes**, so each phase finds the prior phase's output and nothing lands in the repo root.

Announce the chosen directory before starting.

## Pipeline

Run these phases in order. After each, confirm the expected artifact exists in the run directory before advancing.

1. **summarize-cwl** — invoke the `summarize-cwl` skill. Validate and normalize a CWL Workflow tree, then emit a lightweight structured summary for downstream Galaxy translation.
2. **cwl-summary-to-galaxy-interface** — invoke the `cwl-summary-to-galaxy-interface` skill. Map a CWL summary into a Galaxy workflow interface design brief.
3. **cwl-summary-to-galaxy-data-flow** — invoke the `cwl-summary-to-galaxy-data-flow` skill. Translate a CWL summary into a Galaxy data-flow design brief.
4. **compare-against-iwc-exemplar** — invoke the `compare-against-iwc-exemplar` skill. Find nearest IWC exemplar(s) and surface a structural diff against the upstream Galaxy design briefs to guide template authoring.
5. **cwl-summary-to-galaxy-template** — invoke the `cwl-summary-to-galaxy-template` skill. gxformat2 skeleton with per-step TODOs from a CWL summary and prior Galaxy design briefs.
6. **advance-galaxy-draft-step** (loop) — invoke the `advance-galaxy-draft-step` skill, once per step. It owns its own endstate oracle (`gxwf draft-next-step`) and concretizes one drafty step per call; re-invoke until it reports `draft: false`, then continue.
7. **cwl-test-to-galaxy-test-plan** — MANUAL — `cwl-test-to-galaxy-test-plan` is not yet cast. Translate CWL test fixtures into a Galaxy workflow test plan. Do this by hand and confirm before continuing.
8. **implement-galaxy-workflow-test** — invoke the `implement-galaxy-workflow-test` skill. Assemble Galaxy workflow test fixtures and assertions.
9. **validate-galaxy-workflow** — invoke the `validate-galaxy-workflow` skill. Run terminal gxwf validation on an assembled Galaxy workflow and classify workflow-level failures.
10. **run-workflow-test** — invoke the `run-workflow-test` skill. Execute a workflow's tests via Planemo; emit structured pass/fail and outputs.
11. **debug-galaxy-workflow-output** — MANUAL — `debug-galaxy-workflow-output` is not yet cast. Triage failing Galaxy run outputs; classify failure modes; propose fixes. Do this by hand and confirm before continuing.

## Done

Report the final artifacts in `./<run-slug>/` and any phases handled manually (marked MANUAL above).

## Notes

- Do not re-implement any skill's internal logic here; this harness only sequences and routes.
- Carry unresolved assumptions forward as notes rather than inventing missing inputs.
