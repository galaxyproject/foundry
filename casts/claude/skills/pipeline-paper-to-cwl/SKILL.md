---
name: pipeline-paper-to-cwl
description: "Direct path from a paper to a CWL Workflow + CommandLineTool set — orchestrates the Foundry skills of the PAPER → CWL pipeline in order, in a per-run working directory."
---

# pipeline-paper-to-cwl

Harness for the **PAPER → CWL** Foundry pipeline. Runs the constituent skills in order inside a single per-run working directory. Assembled from `content/pipelines/paper-to-cwl.md` (revision 2) — regenerate with `/assemble-pipeline paper-to-cwl` if the pipeline changes; do not hand-edit.

Most CWL-targeting Molds are not yet cast, so this harness is mostly manual checkpoints today; it still fixes the phase order, the per-run working directory, and the few real casts. It strengthens as the CWL Molds land.

## When To Use

- Direct path from a paper to a CWL Workflow + CommandLineTool set.

## Working directory (do this first)

Every constituent skill writes fixed filenames to its working directory. To keep one run's artifacts namespaced and avoid clobbering a prior run (foundry#282):

1. Pick a run slug — use the harness argument if given; else ask the user for a short project name up front (the directory must exist before phase 1 writes its first artifact, so don't wait for a source title); else default `paper-to-cwl-run`.
2. Create `./<run-slug>/` in the current directory. If it exists, suffix `-2`, `-3`, … .
3. Run **every** skill invocation below with `./<run-slug>/` as its working directory: **prefix every default input and output filename with `./<run-slug>/`** when you invoke the skill. The skills preserve their declared basenames and honor a harness-supplied directory; you supply the prefix on **both reads and writes**, so each phase finds the prior phase's output and nothing lands in the repo root.

Announce the chosen directory before starting.

## Pipeline

Run these phases in order. After each, confirm the expected artifact exists in the run directory before advancing.

1. **summarize-paper** — MANUAL — `summarize-paper` is not yet cast. It should extract methods, tools, sample data, and references from the paper into the shared `freeform-summary` handoff (`freeform-summary.md`). Do this by hand and confirm before continuing.
2. **freeform-summary-to-cwl-design** — MANUAL — `freeform-summary-to-cwl-design` is not yet cast. It should translate the free-form summary into a CWL workflow design brief. Do this by hand and confirm before continuing.
3. **summary-to-cwl-template** — MANUAL — `summary-to-cwl-template` is not yet cast. It should emit a CWL Workflow skeleton with per-step TODOs from the source and design handoffs. Do this by hand and confirm before continuing.
4. **summarize-cwl-tool** (loop, once per CWL tool/step) — MANUAL — `summarize-cwl-tool` is not yet cast. It should derive a CommandLineTool description (container, baseCommand, IO) for each tool/step in the template. Do this by hand for each tool. (No shared endstate oracle exists for CWL per-tool loops yet — the iteration set is the tools enumerated in the template.)
5. **implement-cwl-tool-step** (loop, once per CWL tool/step) — MANUAL — `implement-cwl-tool-step` is not yet cast. It should convert each abstract step into a concrete CWL CommandLineTool + step; CommandLineTool authoring is built into this step (no separate discover-or-author branch). Do this by hand for each tool.
6. **validate-cwl** (loop, once per CWL tool/step) — MANUAL — `validate-cwl` is not yet cast. It should run `cwltool --validate` / schema lint on each implemented tool/step, classify failures, and recommend fixes. Do this by hand for each tool.
7. **test-data-resolution** (branch) — resolve the test-data chain in order; stop at the first that yields acceptable test data:
   - MANUAL — `paper-to-test-data` is not yet cast. It should derive workflow test inputs and expected outputs from the paper. Do this by hand first.
   - MANUAL — `find-test-data` is not yet cast. It should search IWC fixtures and public sources for test data matching the data-flow shape. Try this if `paper-to-test-data` yields nothing usable.
   - `user-supplied` — if neither yields acceptable data, ask the user to provide test data directly.
8. **implement-cwl-workflow-test** — MANUAL — `implement-cwl-workflow-test` is not yet cast. It should assemble CWL job file(s) and expected-output assertions. Do this by hand and confirm before continuing.
9. **validate-cwl** — MANUAL — `validate-cwl` is not yet cast. Run terminal `cwltool --validate` / schema lint over the assembled workflow, classify failures, recommend fixes. Do this by hand.
10. **run-workflow-test** — invoke the `run-workflow-test` skill. Executes the workflow's tests via Planemo (which runs CWL as well as Galaxy); emits structured pass/fail and outputs.
11. **debug-cwl-workflow-output** — MANUAL — `debug-cwl-workflow-output` is not yet cast. It should triage failing CWL run outputs, classify failure modes, and propose fixes. Do this by hand if `run-workflow-test` reported failures; otherwise skip.

## Done

Report the final artifacts in `./<run-slug>/` and the phases handled manually (everything except `run-workflow-test`, until the CWL Molds are cast).

## Notes

- Do not re-implement any skill's internal logic here; this harness only sequences and routes.
- CWL per-tool loops (phases 4–6) have no shared `draft-next-step`-style endstate oracle today; iterate over the tools enumerated in the CWL template. This is an open gap to revisit when those Molds are cast.
- CWL targeting has no `discover-or-author` branch — CommandLineTool authoring is built into `implement-cwl-tool-step`, informed by `summarize-cwl-tool`.
- Carry unresolved assumptions forward as notes rather than inventing missing inputs.
