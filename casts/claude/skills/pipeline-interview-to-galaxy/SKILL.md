---
name: pipeline-interview-to-galaxy
description: "Interview-driven path to a Galaxy gxformat2 workflow through the shared freeform-summary handoff — orchestrates the Foundry skills of the INTERVIEW → GALAXY pipeline in order, in a per-run working directory."
---

# pipeline-interview-to-galaxy

Harness for the **INTERVIEW → GALAXY** Foundry pipeline. Runs the constituent skills in order inside a single per-run working directory. Assembled from `content/pipelines/interview-to-galaxy.md` (revision 1) — regenerate with `foundry-build assemble-pipeline interview-to-galaxy` if the pipeline changes; do not hand-edit.

## When To Use

- Interview-driven path to a Galaxy gxformat2 workflow through the shared freeform-summary handoff.

## Working directory (do this first)

Every constituent skill writes fixed filenames to its working directory. To keep one run's artifacts namespaced and avoid clobbering a prior run (foundry#282):

1. Pick a run slug — use the harness argument if given; else ask the user for a short project name up front (the directory must exist before phase 1 writes its first artifact, so don't wait for a source title); else default `interview-to-galaxy-run`.
2. Create `./<run-slug>/` in the current directory. If it exists, suffix `-2`, `-3`, … .
3. Run **every** skill invocation below with `./<run-slug>/` as its working directory: **prefix every default input and output filename with `./<run-slug>/`** when you invoke the skill. The skills preserve their declared basenames and honor a harness-supplied directory; you supply the prefix on **both reads and writes**, so each phase finds the prior phase's output and nothing lands in the repo root.

Announce the chosen directory before starting.

## Pipeline

Run these phases in order. After each, confirm the expected artifact exists in the run directory before advancing.

1. **interview-to-freeform-summary** — invoke the `interview-to-freeform-summary` skill. Normalize a free-form user interview into the shared freeform-summary workflow handoff.
2. **freeform-summary-to-galaxy-interface** — invoke the `freeform-summary-to-galaxy-interface` skill. Map a free-form source summary into a Galaxy workflow interface design brief.
3. **freeform-summary-to-galaxy-data-flow** — invoke the `freeform-summary-to-galaxy-data-flow` skill. Translate a free-form source summary into a Galaxy data-flow design brief.
4. **compare-against-iwc-exemplar** — invoke the `compare-against-iwc-exemplar` skill. Find nearest IWC exemplar(s) and surface a structural diff against the upstream Galaxy design briefs to guide template authoring.
5. **freeform-summary-to-galaxy-template** — invoke the `freeform-summary-to-galaxy-template` skill. gxformat2 skeleton with per-step TODOs from a free-form summary and Galaxy design brief.
6. **advance-galaxy-draft-step** (loop) — invoke the `advance-galaxy-draft-step` skill, once per step. It owns its own endstate oracle (`gxwf draft-next-step`) and concretizes one drafty step per call; re-invoke until it reports `draft: false`, then continue.
7. **test-data-resolution** (branch) — resolve in order; stop at the first that yields acceptable output:
   - Try `find-test-data` (MANUAL — not yet cast). Search IWC fixtures and public sources for test data matching a data-flow shape. Do this by hand.
   - **user-supplied** — if nothing above yields acceptable output, ask the user to supply it directly.
8. **implement-galaxy-workflow-test** — invoke the `implement-galaxy-workflow-test` skill. Assemble Galaxy workflow test fixtures and assertions.
9. **validate-galaxy-workflow** — invoke the `validate-galaxy-workflow` skill. Run terminal gxwf validation on an assembled Galaxy workflow and classify workflow-level failures.
10. **run-workflow-test** — invoke the `run-workflow-test` skill. Execute a workflow's tests via Planemo; emit structured pass/fail and outputs.
11. **debug-galaxy-workflow-output** — MANUAL — `debug-galaxy-workflow-output` is not yet cast. Triage failing Galaxy run outputs; classify failure modes; propose fixes. Do this by hand and confirm before continuing.

## Done

Report the final artifacts in `./<run-slug>/` and any phases handled manually (marked MANUAL above).

## Notes

- Do not re-implement any skill's internal logic here; this harness only sequences and routes.
- Carry unresolved assumptions forward as notes rather than inventing missing inputs.
- v1 "workflow" means a Galaxy `gxformat2` workflow; the live interview mechanics are harness-owned and precede phase 1.
