---
name: pipeline-nextflow-to-cwl
description: "Direct path from a Nextflow pipeline to a CWL Workflow + CommandLineTool set — orchestrates the Foundry skills of the NEXTFLOW → CWL pipeline in order, in a per-run working directory."
---

# pipeline-nextflow-to-cwl

Harness for the **NEXTFLOW → CWL** Foundry pipeline. Runs the constituent skills in order inside a single per-run working directory. Assembled from `content/pipelines/nextflow-to-cwl.md` (revision 2) — regenerate with `/assemble-pipeline nextflow-to-cwl` if the pipeline changes; do not hand-edit.

Most CWL-targeting Molds are not yet cast, so this harness is mostly manual checkpoints today; it still fixes the phase order, the per-run working directory, and the few real casts. It strengthens as the CWL Molds land.

## When To Use

- Direct path from a Nextflow pipeline to a CWL Workflow + CommandLineTool set.

## Working directory (do this first)

Every constituent skill writes fixed filenames to its working directory. To keep one run's artifacts namespaced and avoid clobbering a prior run (foundry#282):

1. Pick a run slug — use the harness argument if given; else ask the user for a short project name up front (the directory must exist before phase 1 writes its first artifact, so don't wait for a source title); else default `nextflow-to-cwl-run`.
2. Create `./<run-slug>/` in the current directory. If it exists, suffix `-2`, `-3`, … .
3. Run **every** skill invocation below with `./<run-slug>/` as its working directory: **prefix every default input and output filename with `./<run-slug>/`** when you invoke the skill. The skills preserve their declared basenames and honor a harness-supplied directory; you supply the prefix on **both reads and writes**, so each phase finds the prior phase's output and nothing lands in the repo root.

Announce the chosen directory before starting.

## Pipeline

Run these phases in order. After each, confirm the expected artifact exists in the run directory before advancing.

1. **summarize-nextflow** — invoke the `summarize-nextflow` skill. Reads the Nextflow pipeline source tree and emits a structured JSON summary for downstream translation.
2. **nextflow-summary-to-cwl-interface** — MANUAL — `nextflow-summary-to-cwl-interface` is not yet cast. It should map the Nextflow summary into a CWL Workflow interface design brief. Do this by hand and confirm before continuing.
3. **nextflow-summary-to-cwl-data-flow** — MANUAL — `nextflow-summary-to-cwl-data-flow` is not yet cast. It should translate the Nextflow summary into a CWL data-flow design brief. Do this by hand and confirm before continuing.
4. **summary-to-cwl-template** — MANUAL — `summary-to-cwl-template` is not yet cast. It should emit a CWL Workflow skeleton with per-step TODOs from the source and design handoffs. Do this by hand and confirm before continuing.
5. **summarize-cwl-tool** (loop, once per CWL tool/step) — MANUAL — `summarize-cwl-tool` is not yet cast. It should derive a CommandLineTool description (container, baseCommand, IO) for each tool/step in the template. Do this by hand for each tool. (No shared endstate oracle exists for CWL per-tool loops yet — the iteration set is the tools enumerated in the template.)
6. **implement-cwl-tool-step** (loop, once per CWL tool/step) — MANUAL — `implement-cwl-tool-step` is not yet cast. It should convert each abstract step into a concrete CWL CommandLineTool + step. Do this by hand for each tool.
7. **validate-cwl** (loop, once per CWL tool/step) — MANUAL — `validate-cwl` is not yet cast. It should run `cwltool --validate` / schema lint on each implemented tool/step, classify failures, and recommend fixes. Do this by hand for each tool.
8. **nextflow-test-to-cwl-test-plan** — MANUAL — `nextflow-test-to-cwl-test-plan` is not yet cast. It should translate Nextflow test evidence into a CWL workflow test plan. Do this by hand and confirm before continuing.
9. **implement-cwl-workflow-test** — MANUAL — `implement-cwl-workflow-test` is not yet cast. It should assemble CWL job file(s) and expected-output assertions. Do this by hand and confirm before continuing.
10. **validate-cwl** — MANUAL — `validate-cwl` is not yet cast. Run terminal `cwltool --validate` / schema lint over the assembled workflow, classify failures, recommend fixes. Do this by hand.
11. **run-workflow-test** — invoke the `run-workflow-test` skill. Executes the workflow's tests via Planemo (which runs CWL as well as Galaxy); emits structured pass/fail and outputs.
12. **debug-cwl-workflow-output** — MANUAL — `debug-cwl-workflow-output` is not yet cast. It should triage failing CWL run outputs, classify failure modes, and propose fixes. Do this by hand if `run-workflow-test` reported failures; otherwise skip.

## Done

Report the final artifacts in `./<run-slug>/` and the phases handled manually (everything except `summarize-nextflow` and `run-workflow-test`, until the CWL Molds are cast).

## Notes

- Do not re-implement any skill's internal logic here; this harness only sequences and routes.
- CWL per-tool loops (phases 5–7) have no shared `draft-next-step`-style endstate oracle today; iterate over the tools enumerated in the CWL template. This is an open gap to revisit when those Molds are cast.
- NF brings real test fixtures, so `nextflow-test-to-cwl-test-plan` replaces the `test-data-resolution` chain that paper-sourced pipelines need.
- Carry unresolved assumptions forward as notes rather than inventing missing inputs.
