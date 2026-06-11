---
name: pipeline-nextflow-to-galaxy
description: "Direct path from a Nextflow pipeline to a Galaxy gxformat2 workflow — orchestrates the Foundry skills of the NEXTFLOW → GALAXY pipeline in order, in a per-run working directory."
---

# pipeline-nextflow-to-galaxy

Harness for the **NEXTFLOW → GALAXY** Foundry pipeline. Runs the constituent skills in order inside a single per-run working directory. Assembled from `content/pipelines/nextflow-to-galaxy.md` (revision 3) — regenerate with `foundry-build assemble-pipeline nextflow-to-galaxy` if the pipeline changes; do not hand-edit.

## When To Use

- Direct path from a Nextflow pipeline to a Galaxy gxformat2 workflow.

## Working directory (do this first)

Every constituent skill writes fixed filenames to its working directory. To keep one run's artifacts namespaced and avoid clobbering a prior run (foundry#282):

1. Pick a run slug — use the harness argument if given; else ask the user for a short project name up front (the directory must exist before phase 1 writes its first artifact, so don't wait for a source title); else default `nextflow-to-galaxy-run`.
2. Create `./<run-slug>/` in the current directory. If it exists, suffix `-2`, `-3`, … .
3. Run **every** skill invocation below with `./<run-slug>/` as its working directory: **prefix every default input and output filename with `./<run-slug>/`** when you invoke the skill. The skills preserve their declared basenames and honor a harness-supplied directory; you supply the prefix on **both reads and writes**, so each phase finds the prior phase's output and nothing lands in the repo root.

Announce the chosen directory before starting.

## Pipeline

Run these phases in order. After each, confirm the expected artifact exists in the run directory before advancing.

1. **summarize-nextflow** — invoke the `summarize-nextflow` skill. Read a Nextflow pipeline source tree (nf-core or ad-hoc DSL2) and emit a structured JSON summary for downstream translation Molds.
2. **nextflow-summary-to-galaxy-reference-data** — MANUAL — `nextflow-summary-to-galaxy-reference-data` is not yet cast. Decide the Galaxy-side shape of external reference data declared by a Nextflow pipeline. Do this by hand and confirm before continuing.
3. **nextflow-summary-to-galaxy-interface** — invoke the `nextflow-summary-to-galaxy-interface` skill. Map a Nextflow summary into a Galaxy workflow interface design brief.
4. **nextflow-summary-to-galaxy-data-flow** — invoke the `nextflow-summary-to-galaxy-data-flow` skill. Translate a Nextflow summary into a Galaxy data-flow design brief.
5. **compare-against-iwc-exemplar** — invoke the `compare-against-iwc-exemplar` skill. Find nearest IWC exemplar(s) and surface a structural diff against the upstream Galaxy design briefs to guide template authoring.
6. **nextflow-summary-to-galaxy-template** — invoke the `nextflow-summary-to-galaxy-template` skill. gxformat2 skeleton with per-step TODOs from a Nextflow summary and prior Galaxy design briefs.
7. **advance-galaxy-draft-step** (loop) — invoke the `advance-galaxy-draft-step` skill, once per step. It owns its own endstate oracle (`gxwf draft-next-step`) and concretizes one drafty step per call; re-invoke until it reports `draft: false`, then continue.
8. **nextflow-test-to-galaxy-test-plan** — MANUAL — `nextflow-test-to-galaxy-test-plan` is not yet cast. Translate Nextflow test evidence into a Galaxy workflow test plan. Do this by hand and confirm before continuing.
9. **implement-galaxy-workflow-test** — invoke the `implement-galaxy-workflow-test` skill. Assemble Galaxy workflow test fixtures and assertions.
10. **validate-galaxy-workflow** — invoke the `validate-galaxy-workflow` skill. Run terminal gxwf validation on an assembled Galaxy workflow and classify workflow-level failures.
11. **run-workflow-test** — invoke the `run-workflow-test` skill. Execute a workflow's tests via Planemo; emit structured pass/fail and outputs.
12. **debug-galaxy-workflow-output** — MANUAL — `debug-galaxy-workflow-output` is not yet cast. Triage failing Galaxy run outputs; classify failure modes; propose fixes. Do this by hand and confirm before continuing.

## Done

Report the final artifacts in `./<run-slug>/` and any phases handled manually (marked MANUAL above).

## Notes

- Do not re-implement any skill's internal logic here; this harness only sequences and routes.
- Carry unresolved assumptions forward as notes rather than inventing missing inputs.
- Replaces the prior-art hand-authored `nf-to-galaxy` skill — same goal, decomposed into Molds, validation-driven.
