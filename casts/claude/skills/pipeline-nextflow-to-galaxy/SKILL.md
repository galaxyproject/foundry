---
name: pipeline-nextflow-to-galaxy
description: "Direct path from a Nextflow pipeline to a Galaxy gxformat2 workflow — orchestrates the Foundry skills of the NEXTFLOW → GALAXY pipeline in order, in a per-run working directory."
---

# pipeline-nextflow-to-galaxy

Harness for the **NEXTFLOW → GALAXY** Foundry pipeline. Runs the constituent skills in order inside a single per-run working directory. Assembled from `content/pipelines/nextflow-to-galaxy.md` (revision 3) — regenerate with `/assemble-pipeline nextflow-to-galaxy` if the pipeline changes; do not hand-edit.

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

1. **summarize-nextflow** — invoke the `summarize-nextflow` skill. Reads the Nextflow pipeline source tree and emits a structured JSON summary for downstream translation.
2. **nextflow-summary-to-galaxy-reference-data** — MANUAL — `nextflow-summary-to-galaxy-reference-data` is not yet cast. It should decide the Galaxy-side shape of external reference data declared by the Nextflow pipeline. Do this by hand and confirm before continuing.
3. **nextflow-summary-to-galaxy-interface** — invoke the `nextflow-summary-to-galaxy-interface` skill. Maps the Nextflow summary into a Galaxy workflow interface design brief.
4. **nextflow-summary-to-galaxy-data-flow** — invoke the `nextflow-summary-to-galaxy-data-flow` skill. Translates the Nextflow summary into a Galaxy data-flow design brief.
5. **compare-against-iwc-exemplar** — invoke the `compare-against-iwc-exemplar` skill. Surfaces the nearest IWC exemplar(s) and a structural diff to guide template authoring.
6. **nextflow-summary-to-galaxy-template** — invoke the `nextflow-summary-to-galaxy-template` skill. Emits the gxformat2 skeleton with per-step TODOs (`galaxy-workflow-draft.gxwf.yml`).
7. **advance-galaxy-draft-step** (loop) — re-invoke the `advance-galaxy-draft-step` skill repeatedly. It owns its own endstate oracle (`gxwf draft-next-step`) and concretizes one drafty step per call; stop when it reports `draft: false` (no remaining drafty steps), then continue.
8. **nextflow-test-to-galaxy-test-plan** — MANUAL — `nextflow-test-to-galaxy-test-plan` is not yet cast. It should translate Nextflow test evidence into a Galaxy workflow test plan. Do this by hand and confirm before continuing.
9. **implement-galaxy-workflow-test** — invoke the `implement-galaxy-workflow-test` skill. Assembles the Galaxy workflow test fixtures and assertions.
10. **validate-galaxy-workflow** — invoke the `validate-galaxy-workflow` skill. Runs terminal gxwf validation on the assembled workflow and classifies failures.
11. **run-workflow-test** — invoke the `run-workflow-test` skill. Executes the workflow's tests via Planemo; emits structured pass/fail and outputs.
12. **debug-galaxy-workflow-output** — MANUAL — `debug-galaxy-workflow-output` is not yet cast. It should triage failing Galaxy run outputs, classify failure modes, and propose fixes. Do this by hand if `run-workflow-test` reported failures; otherwise skip.

## Done

Report the final artifacts in `./<run-slug>/` (notably the concretized `galaxy-workflow-draft.gxwf.yml` and the test outputs) and any phases that were handled manually (`nextflow-summary-to-galaxy-reference-data`, `nextflow-test-to-galaxy-test-plan`, `debug-galaxy-workflow-output`).

## Notes

- Do not re-implement any skill's internal logic here; this harness only sequences and routes. Endstate detection for the per-step loop belongs to `advance-galaxy-draft-step`.
- Carry unresolved assumptions forward as notes rather than inventing missing inputs.
- Replaces the prior-art hand-authored `nf-to-galaxy` skill — same goal, decomposed into Molds, validation-driven.
