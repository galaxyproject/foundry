---
name: pipeline-paper-to-cwl
description: "Direct path from a paper to a CWL Workflow + CommandLineTool set — orchestrates the Foundry skills of the PAPER → CWL pipeline in order, in a per-run working directory."
---

# pipeline-paper-to-cwl

Harness for the **PAPER → CWL** Foundry pipeline. Runs the constituent skills in order inside a single per-run working directory. Assembled from `content/pipelines/paper-to-cwl/index.md` (revision 2) — regenerate with `foundry-build assemble-pipeline paper-to-cwl` if the pipeline changes; do not hand-edit.

Most of this pipeline's Molds are not yet cast, so this harness is mostly manual checkpoints today; it still fixes the phase order, the per-run working directory, and the few real casts. It strengthens as the remaining Molds are cast.

## When To Use

- Direct path from a paper to a CWL Workflow + CommandLineTool set.

## Bootstrap (install these CLIs first)

Install the harness CLIs every constituent skill invokes before driving the pipeline. Deduped across all phases; bioinformatics tools the constructed workflow installs are out of scope (the discovery phase pins those).

- **`gxwf`** (gxwf). `npm install -g @galaxy-tool-util/cli@1.7.2`.
  Ephemeral run: `npx --yes --package @galaxy-tool-util/cli@1.7.2 gxwf`.
  Check: `gxwf --help | grep -q draft-validate`.
  Docs: https://github.com/jmchilton/galaxy-tool-util-ts/tree/main/packages/cli
- **`planemo`** (planemo). `uv tool install planemo==git+https://github.com/jmchilton/planemo@a9b8b8bc7ab3b12035d53bdb5383fe450413d9f3` (or `pip install planemo==git+https://github.com/jmchilton/planemo@a9b8b8bc7ab3b12035d53bdb5383fe450413d9f3`).
  Ephemeral run: `uvx --from git+https://github.com/jmchilton/planemo@a9b8b8bc7ab3b12035d53bdb5383fe450413d9f3 planemo`.
  Check: `planemo --version`.
  Docs: https://planemo.readthedocs.io/

## Run options

Optional flags, given as leading arguments. Strip any you recognize; treat the remaining positional argument as the run slug. Both default off and compose.

- `--use-subagents` — run each cast phase in its own subagent to keep this orchestrator's context small. For each phase whose skill is cast, spawn a subagent, tell it the run directory and to invoke the named skill with every default filename prefixed by `./<run-slug>/`, and have it return a short report (artifacts written, assumptions, status) rather than its full transcript; carry only that report forward. A cast loop phase runs **one subagent per iteration** — each advances a single step and returns its done-signal, and you inspect that signal to decide whether to spawn the next iteration. Branch phases run their whole fallback chain in one subagent. MANUAL (un-cast) phases are never delegated — including MANUAL loop phases — so handle those yourself regardless of the per-iteration rule above.
- `--checkpoint` — commit after every phase so the run directory's git history is a per-step record (a data source for workflow-implementation visualizations). When set, `git init ./<run-slug>/` during working-directory setup — this is a standalone per-run repo; do not add it to any surrounding repo you are working inside. Then after each phase's artifact is confirmed run `git -C ./<run-slug>/ add -A && git -C ./<run-slug>/ commit -m "phase <n>: <skill>"`. Loop phases commit **once per iteration** (`phase <n> step <k>: <skill>`); for a MANUAL loop, commit once per by-hand step. With `--use-subagents`, the subagent does the work and returns; you make the commit.

## Working directory (do this first)

Every constituent skill writes fixed filenames to its working directory. To keep one run's artifacts namespaced and avoid clobbering a prior run (foundry#282):

1. Pick a run slug — use the harness argument if given; else ask the user for a short project name up front (the directory must exist before phase 1 writes its first artifact, so don't wait for a source title); else default `paper-to-cwl-run`.
2. Create `./<run-slug>/` in the current directory. If it exists, suffix `-2`, `-3`, … . If invoked with `--checkpoint`, run `git init ./<run-slug>/` now (see Run options).
3. Run **every** skill invocation below with `./<run-slug>/` as its working directory: **prefix every default input and output filename with `./<run-slug>/`** when you invoke the skill. The skills preserve their declared basenames and honor a harness-supplied directory; you supply the prefix on **both reads and writes**, so each phase finds the prior phase's output and nothing lands in the repo root.

Announce the chosen directory before starting.

## Pipeline

Run these phases in order. After each, confirm the expected artifact exists in the run directory before advancing.

1. **summarize-paper** — MANUAL — `summarize-paper` is not yet cast. Extract methods, tools, sample data, and references from a paper. Do this by hand and confirm before continuing.
2. **freeform-summary-to-cwl-design** — MANUAL — `freeform-summary-to-cwl-design` is not yet cast. Translate a free-form source summary into a CWL workflow design brief. Do this by hand and confirm before continuing.
3. **summary-to-cwl-template** — MANUAL — `summary-to-cwl-template` is not yet cast. CWL Workflow skeleton with per-step TODOs from source and design handoffs. Do this by hand and confirm before continuing.
4. **summarize-cwl-tool** (loop) — MANUAL — `summarize-cwl-tool` is not yet cast. Derive a CommandLineTool description (container, baseCommand, IO) for a CWL target. No shared endstate oracle yet; iterate over the tools enumerated in the CWL template, doing each by hand.
5. **implement-cwl-tool-step** (loop) — MANUAL — `implement-cwl-tool-step` is not yet cast. Convert an abstract step into a concrete CWL CommandLineTool + step. No shared endstate oracle yet; iterate over the tools enumerated in the CWL template, doing each by hand.
6. **validate-cwl** (loop) — MANUAL — `validate-cwl` is not yet cast. Run cwltool --validate / schema lint, classify failures, recommend fixes. No shared endstate oracle yet; iterate over the tools enumerated in the CWL template, doing each by hand.
7. **test-data-resolution** (branch) — resolve in order; stop at the first that yields acceptable output:
   - Try `paper-to-test-data` (MANUAL — not yet cast). Derive workflow test inputs and expected outputs from a paper. Do this by hand.
   - Otherwise try `find-test-data` — Search IWC fixtures and public sources for test data matching a data-flow shape.
   - **user-supplied** — if nothing above yields acceptable output, ask the user to supply it directly.
8. **implement-cwl-workflow-test** — MANUAL — `implement-cwl-workflow-test` is not yet cast. Assemble CWL job file(s) and expected-output assertions. Do this by hand and confirm before continuing.
9. **validate-cwl** — MANUAL — `validate-cwl` is not yet cast. Run cwltool --validate / schema lint, classify failures, recommend fixes. Do this by hand and confirm before continuing.
10. **run-workflow-test** — invoke the `run-workflow-test` skill. Execute a workflow's tests via Planemo; emit structured pass/fail and outputs.
11. **debug-cwl-workflow-output** — MANUAL — `debug-cwl-workflow-output` is not yet cast. Triage failing CWL run outputs; classify failure modes; propose fixes. Do this by hand and confirm before continuing.

## Done

Report the final artifacts in `./<run-slug>/` and any phases handled manually (marked MANUAL above).

## Notes

- Do not re-implement any skill's internal logic here; this harness only sequences and routes.
- Carry unresolved assumptions forward as notes rather than inventing missing inputs.
- CWL targeting has no `discover-or-author` branch — CommandLineTool authoring is built into `implement-cwl-tool-step`, informed by `summarize-cwl-tool`.
