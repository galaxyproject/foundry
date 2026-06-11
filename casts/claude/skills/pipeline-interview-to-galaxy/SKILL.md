---
name: pipeline-interview-to-galaxy
description: "Interview-driven path to a Galaxy gxformat2 workflow — orchestrates the Foundry skills of the INTERVIEW → GALAXY pipeline in order, in a per-run working directory."
---

# pipeline-interview-to-galaxy

Harness for the **INTERVIEW → GALAXY** Foundry pipeline. Runs the constituent skills in order inside a single per-run working directory. Assembled from `content/pipelines/interview-to-galaxy.md` (revision 1) — regenerate with `/assemble-pipeline interview-to-galaxy` if the pipeline changes; do not hand-edit.

## When To Use

- Interview-driven path to a Galaxy gxformat2 workflow through the shared freeform-summary handoff.

## Working directory (do this first)

Every constituent skill writes fixed filenames to its working directory. To keep one run's artifacts namespaced and avoid clobbering a prior run (foundry#282):

1. Pick a run slug — use the harness argument if given; else ask the user for a short project name up front (the directory must exist before phase 1 writes `freeform-summary.md`, so don't wait for a source title); else default `interview-to-galaxy-run`.
2. Create `./<run-slug>/` in the current directory. If it exists, suffix `-2`, `-3`, … .
3. Run **every** skill invocation below with `./<run-slug>/` as its working directory: **prefix every default input and output filename with `./<run-slug>/`** when you invoke the skill. The skills preserve their declared basenames (`freeform-summary.md`, `galaxy-workflow-draft.gxwf.yml`, …) and honor a harness-supplied directory; you supply the prefix on **both reads and writes**, so each phase finds the prior phase's output and nothing lands in the repo root.

Announce the chosen directory before starting.

## Pipeline

Run these phases in order. After each, confirm the expected artifact exists in the run directory before advancing.

1. **interview-to-freeform-summary** — invoke the `interview-to-freeform-summary` skill. Normalizes the user interview into the shared `freeform-summary` handoff (`freeform-summary.md`).
2. **freeform-summary-to-galaxy-interface** — invoke the `freeform-summary-to-galaxy-interface` skill. Maps the summary into a Galaxy workflow interface design brief.
3. **freeform-summary-to-galaxy-data-flow** — invoke the `freeform-summary-to-galaxy-data-flow` skill. Translates the summary into a Galaxy data-flow design brief.
4. **compare-against-iwc-exemplar** — invoke the `compare-against-iwc-exemplar` skill. Surfaces the nearest IWC exemplar(s) and a structural diff to guide template authoring.
5. **freeform-summary-to-galaxy-template** — invoke the `freeform-summary-to-galaxy-template` skill. Emits the gxformat2 skeleton with per-step TODOs (`galaxy-workflow-draft.gxwf.yml`).
6. **advance-galaxy-draft-step** (loop) — re-invoke the `advance-galaxy-draft-step` skill repeatedly. It owns its own endstate oracle (`gxwf draft-next-step`) and concretizes one drafty step per call; stop when it reports `draft: false` (no remaining drafty steps), then continue.
7. **test-data-resolution** (branch) — resolve the test-data chain: first try `find-test-data`; if that yields nothing acceptable, fall through to `user-supplied` — ask the user to provide test data directly. Stop at the first that yields acceptable test data.
   - MANUAL — `find-test-data` is not yet cast. It should search IWC fixtures and public sources for test data matching the data-flow shape. Do this by hand and confirm before continuing; if nothing fits, fall through to asking the user.
8. **implement-galaxy-workflow-test** — invoke the `implement-galaxy-workflow-test` skill. Assembles the Galaxy workflow test fixtures and assertions.
9. **validate-galaxy-workflow** — invoke the `validate-galaxy-workflow` skill. Runs terminal gxwf validation on the assembled workflow and classifies failures.
10. **run-workflow-test** — invoke the `run-workflow-test` skill. Executes the workflow's tests via Planemo; emits structured pass/fail and outputs.
11. **debug-galaxy-workflow-output** — MANUAL — `debug-galaxy-workflow-output` is not yet cast. It should triage failing Galaxy run outputs, classify failure modes, and propose fixes. Do this by hand if `run-workflow-test` reported failures; otherwise skip.

## Done

Report the final artifacts in `./<run-slug>/` (notably the concretized `galaxy-workflow-draft.gxwf.yml` and the test outputs) and any phases that were handled manually (`find-test-data`, `debug-galaxy-workflow-output`).

## Notes

- Do not re-implement any skill's internal logic here; this harness only sequences and routes. Endstate detection for the per-step loop belongs to `advance-galaxy-draft-step`.
- Carry unresolved assumptions forward as notes rather than inventing missing inputs.
- v1 "workflow" means a Galaxy `gxformat2` workflow; the live interview mechanics are harness-owned and precede phase 1.
