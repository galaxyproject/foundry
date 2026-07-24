---
name: pipeline-nextflow-to-cwl
description: "Direct path from a Nextflow pipeline to a CWL Workflow + CommandLineTool set — orchestrates the Foundry skills of the NEXTFLOW → CWL pipeline in order, in a per-run working directory."
---

# pipeline-nextflow-to-cwl

Harness for the **NEXTFLOW → CWL** Foundry pipeline. Runs the constituent skills in order inside a single per-run working directory. Assembled from `content/pipelines/nextflow-to-cwl/index.md` (revision 2) — regenerate with `foundry-build assemble-pipeline nextflow-to-cwl` if the pipeline changes; do not hand-edit.

## When To Use

- Direct path from a Nextflow pipeline to a CWL Workflow + CommandLineTool set.

## Bootstrap (install these CLIs first)

Install the harness CLIs every constituent skill invokes before driving the pipeline. Deduped across all phases; bioinformatics tools the constructed workflow installs are out of scope (the discovery phase pins those).

- **`foundry`** (foundry). `npm install -g @galaxy-foundry/foundry`.
  Ephemeral run: `npx --package @galaxy-foundry/foundry foundry`.
  Check: `foundry --help`.
  Docs: https://github.com/galaxyproject/foundry/blob/main/packages/foundry/README.md
- **`gxwf`** (gxwf). `npm install -g '@galaxy-tool-util/cli@^1.8.1'`.
  Ephemeral run: `npx --yes --package @galaxy-tool-util/cli@1.8.1 gxwf`.
  Check: `gxwf --help | grep -q draft-validate`.
  Docs: https://github.com/jmchilton/galaxy-tool-util-ts/tree/main/packages/cli
- **`planemo`** (planemo). `uv tool install planemo==0.75.45` (or `pip install planemo==0.75.45`).
  Ephemeral run: `uvx --from planemo==0.75.45 planemo`.
  Check: `planemo --version`.
  Docs: https://planemo.readthedocs.io/

## Run options

Optional flags, given as leading arguments. Strip any you recognize; treat the remaining positional argument as the run slug. Both default off and compose.

- `--use-subagents` — run each cast phase in its own subagent to keep this orchestrator's context small. For each phase whose skill is cast, spawn a subagent, tell it the run directory and to invoke the named skill with every default filename prefixed by `./<run-slug>/`, and have it return a short report (artifacts written, assumptions, status) rather than its full transcript; carry only that report forward. A cast loop phase runs **one subagent per iteration** — each advances a single step and returns its done-signal, and you inspect that signal to decide whether to spawn the next iteration. Branch phases run their whole fallback chain in one subagent. MANUAL (un-cast) phases are never delegated — including MANUAL loop phases — so handle those yourself regardless of the per-iteration rule above.
- `--checkpoint` — commit after every phase so the run directory's git history is a per-step record (a data source for workflow-implementation visualizations). When set, `git init ./<run-slug>/` during working-directory setup — this is a standalone per-run repo; do not add it to any surrounding repo you are working inside. Then after each phase's artifact is confirmed run `git -C ./<run-slug>/ add -A && git -C ./<run-slug>/ commit -m "phase <n>: <skill>"`. Loop phases commit **once per iteration** (`phase <n> step <k>: <skill>`); for a MANUAL loop, commit once per by-hand step. With `--use-subagents`, the subagent does the work and returns; you make the commit.

## Working directory (do this first)

Every constituent skill writes fixed filenames to its working directory. To keep one run's artifacts namespaced and avoid clobbering a prior run (foundry#282):

1. Pick a run slug — use the harness argument if given; else ask the user for a short project name up front (the directory must exist before phase 1 writes its first artifact, so don't wait for a source title); else default `nextflow-to-cwl-run`.
2. Create `./<run-slug>/` in the current directory. If it exists, suffix `-2`, `-3`, … . If invoked with `--checkpoint`, run `git init ./<run-slug>/` now (see Run options).
3. Run **every** skill invocation below with `./<run-slug>/` as its working directory: **prefix every default input and output filename with `./<run-slug>/`** when you invoke the skill. The skills preserve their declared basenames and honor a harness-supplied directory; you supply the prefix on **both reads and writes**, so each phase finds the prior phase's output and nothing lands in the repo root.

Announce the chosen directory before starting.

## Pipeline

Run these phases in order. After each, confirm the expected artifact exists in the run directory before advancing.

1. **summarize-nextflow** — invoke the `summarize-nextflow` skill. Read a Nextflow pipeline source tree (nf-core or ad-hoc DSL2) and emit a structured JSON summary for downstream translation Molds.
2. **nextflow-summary-to-cwl-interface** — invoke the `nextflow-summary-to-cwl-interface` skill. Map a Nextflow summary into a CWL Workflow interface design brief.
3. **nextflow-summary-to-cwl-data-flow** — invoke the `nextflow-summary-to-cwl-data-flow` skill. Translate a Nextflow summary into a CWL data-flow design brief.
4. **summary-to-cwl-template** — invoke the `summary-to-cwl-template` skill. CWL Workflow skeleton with per-step TODOs from source and design handoffs.
5. **summarize-cwl-tool** (loop) — invoke the `summarize-cwl-tool` skill, once per step. No shared endstate oracle yet; iterate over the tools enumerated in the CWL template, doing each by hand.
6. **implement-cwl-tool-step** (loop) — invoke the `implement-cwl-tool-step` skill, once per step. No shared endstate oracle yet; iterate over the tools enumerated in the CWL template, doing each by hand.
7. **validate-cwl** (loop) — invoke the `validate-cwl` skill, once per step. No shared endstate oracle yet; iterate over the tools enumerated in the CWL template, doing each by hand.
8. **nextflow-test-to-cwl-test-plan** — invoke the `nextflow-test-to-cwl-test-plan` skill. Translate Nextflow test evidence into a CWL workflow test plan.
9. **implement-cwl-workflow-test** — invoke the `implement-cwl-workflow-test` skill. Assemble CWL job file(s) and expected-output assertions.
10. **validate-cwl** — invoke the `validate-cwl` skill. Run cwltool --validate / schema lint, classify failures, recommend fixes.
11. **run-workflow-test** — invoke the `run-workflow-test` skill. Execute a workflow's tests via Planemo; emit structured pass/fail and outputs.
12. **debug-cwl-workflow-output** — invoke the `debug-cwl-workflow-output` skill. Triage failing CWL run outputs; classify failure modes; propose fixes.

## Done

Report the final artifacts in `./<run-slug>/`.

## Notes

- Do not re-implement any skill's internal logic here; this harness only sequences and routes.
- Carry unresolved assumptions forward as notes rather than inventing missing inputs.
- NF brings real test fixtures, so `nextflow-test-to-cwl-test-plan` replaces the `test-data-resolution` chain that paper-sourced pipelines need.
