---
name: pipeline-nextflow-to-galaxy
description: "Direct path from a Nextflow pipeline to a Galaxy gxformat2 workflow — orchestrates the Foundry skills of the NEXTFLOW → GALAXY pipeline in order, in a per-run working directory."
---

# pipeline-nextflow-to-galaxy

Harness for the **NEXTFLOW → GALAXY** Foundry pipeline. Runs the constituent skills in order inside a single per-run working directory. Assembled from `content/pipelines/nextflow-to-galaxy/index.md` (revision 3) — regenerate with `foundry-build assemble-pipeline nextflow-to-galaxy` if the pipeline changes; do not hand-edit.

## When To Use

- Direct path from a Nextflow pipeline to a Galaxy gxformat2 workflow.

## Bootstrap (install these CLIs first)

Install the harness CLIs every constituent skill invokes before driving the pipeline. Deduped across all phases; bioinformatics tools the constructed workflow installs are out of scope (the discovery phase pins those).

- **`foundry`** (foundry). `npm install -g @galaxy-foundry/foundry`.
  Ephemeral run: `npx --package @galaxy-foundry/foundry foundry`.
  Check: `foundry --help`.
  Docs: https://github.com/galaxyproject/foundry/blob/main/packages/foundry/README.md
- **`gxwf`** (gxwf). `npm install -g @galaxy-tool-util/cli@^1.8.1`.
  Ephemeral run: `npx --yes --package @galaxy-tool-util/cli@1.8.1 gxwf`.
  Check: `gxwf --help | grep -q draft-validate`.
  Docs: https://github.com/jmchilton/galaxy-tool-util-ts/tree/main/packages/cli
- **`planemo`** (planemo). `uv tool install planemo==0.75.44` (or `pip install planemo==0.75.44`).
  Ephemeral run: `uvx --from planemo==0.75.44 planemo`.
  Check: `planemo --version`.
  Docs: https://planemo.readthedocs.io/

## Run options

Optional flags, given as leading arguments. Strip any you recognize; treat the remaining positional argument as the run slug. Both default off and compose.

- `--use-subagents` — run each cast phase in its own subagent to keep this orchestrator's context small. For each phase whose skill is cast, spawn a subagent, tell it the run directory and to invoke the named skill with every default filename prefixed by `./<run-slug>/`, and have it return a short report (artifacts written, assumptions, status) rather than its full transcript; carry only that report forward. A cast loop phase runs **one subagent per iteration** — each advances a single step and returns its done-signal, and you inspect that signal to decide whether to spawn the next iteration. Branch phases run their whole fallback chain in one subagent. MANUAL (un-cast) phases are never delegated — including MANUAL loop phases — so handle those yourself regardless of the per-iteration rule above.
- `--checkpoint` — commit after every phase so the run directory's git history is a per-step record (a data source for workflow-implementation visualizations). When set, `git init ./<run-slug>/` during working-directory setup — this is a standalone per-run repo; do not add it to any surrounding repo you are working inside. Then after each phase's artifact is confirmed run `git -C ./<run-slug>/ add -A && git -C ./<run-slug>/ commit -m "phase <n>: <skill>"`. Loop phases commit **once per iteration** (`phase <n> step <k>: <skill>`); for a MANUAL loop, commit once per by-hand step. With `--use-subagents`, the subagent does the work and returns; you make the commit.

## Working directory (do this first)

Every constituent skill writes fixed filenames to its working directory. To keep one run's artifacts namespaced and avoid clobbering a prior run (foundry#282):

1. Pick a run slug — use the harness argument if given; else ask the user for a short project name up front (the directory must exist before phase 1 writes its first artifact, so don't wait for a source title); else default `nextflow-to-galaxy-run`.
2. Create `./<run-slug>/` in the current directory. If it exists, suffix `-2`, `-3`, … . If invoked with `--checkpoint`, run `git init ./<run-slug>/` now (see Run options).
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
7. **advance-galaxy-draft-step** (loop) — invoke the `advance-galaxy-draft-step` skill, once per step. It owns its own endstate oracle (`gxwf draft-next-step`) and concretizes one drafty step per call; re-invoke until it reports `draft: false`, then it extracts the concrete `galaxy-workflow.gxwf.yml` (via `gxwf draft-extract`) and continues.
8. **test-data-resolution** (branch) — resolve in order; stop at the first that yields acceptable output:
   - Try `find-test-data` — Search IWC fixtures and public sources for test data matching a data-flow shape.
   - **user-supplied** — if nothing above yields acceptable output, ask the user to supply it directly.
9. **nextflow-test-to-galaxy-test-plan** — MANUAL — `nextflow-test-to-galaxy-test-plan` is not yet cast. Translate Nextflow test evidence into a Galaxy workflow test plan. Do this by hand and confirm before continuing.
10. **implement-galaxy-workflow-test** — invoke the `implement-galaxy-workflow-test` skill. Assemble Galaxy workflow test fixtures and assertions.
11. **validate-galaxy-workflow** — invoke the `validate-galaxy-workflow` skill. Run terminal gxwf validation on an assembled Galaxy workflow and classify workflow-level failures.
12. **run-workflow-test** — invoke the `run-workflow-test` skill. Execute a workflow's tests via Planemo; emit structured pass/fail and outputs.
13. **debug-galaxy-workflow-output** — invoke the `debug-galaxy-workflow-output` skill. Triage failing Galaxy run outputs; classify the failure surface and capture evidence before recommending repairs.

## Done

Report the final artifacts in `./<run-slug>/` and any phases handled manually (marked MANUAL above).

## Notes

- Do not re-implement any skill's internal logic here; this harness only sequences and routes.
- Carry unresolved assumptions forward as notes rather than inventing missing inputs.
- Replaces the prior-art hand-authored `nf-to-galaxy` skill — same goal, decomposed into Molds, validation-driven.
