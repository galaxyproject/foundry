---
name: pipeline-galaxy-workflow-review
description: "Post-construction review journey: summarize, validate, and test an existing Galaxy workflow, then apply pinned IWC policy — orchestrates the Foundry skills of the GALAXY WORKFLOW REVIEW pipeline in order, in a per-run working directory."
---

# pipeline-galaxy-workflow-review

Harness for the **GALAXY WORKFLOW REVIEW** Foundry pipeline. Runs the constituent skills in order inside a single per-run working directory. Assembled from `content/pipelines/galaxy-workflow-review/index.md` (revision 1) — regenerate with `foundry-build assemble-pipeline galaxy-workflow-review` if the pipeline changes; do not hand-edit.

## When To Use

- Post-construction review journey: summarize, validate, and test an existing Galaxy workflow, then apply pinned IWC policy.

## Bootstrap (install these CLIs first)

Install the harness CLIs every constituent skill invokes before driving the pipeline. Deduped across all phases; bioinformatics tools the constructed workflow installs are out of scope (the discovery phase pins those).

- **`foundry`** (foundry). `npm install -g @galaxy-foundry/gxwf-foundry`.
  Ephemeral run: `npx --package @galaxy-foundry/gxwf-foundry foundry`.
  Check: `foundry --help`.
  Docs: https://github.com/galaxyproject/foundry/blob/main/packages/gxwf-foundry/README.md
- **`gxwf`** (gxwf). `npm install -g '@galaxy-tool-util/cli@^1.8.1'`.
  Ephemeral run: `npx --yes --package @galaxy-tool-util/cli@1.8.1 gxwf`.
  Check: `gxwf --help | grep -q draft-validate`.
  Docs: https://github.com/jmchilton/galaxy-tool-util-ts/tree/main/packages/cli
- **`planemo`** (planemo). `uv tool install planemo==0.75.47` (or `pip install planemo==0.75.47`).
  Ephemeral run: `uvx --from planemo==0.75.47 planemo`.
  Check: `planemo --version`.
  Docs: https://planemo.readthedocs.io/

## Run options

Optional flags, given as leading arguments. Strip any you recognize; treat the remaining positional argument as the run slug. All default off and compose.

- `--use-subagents` — run each cast phase in its own subagent to keep this orchestrator's context small. For each phase whose skill is cast, spawn a subagent, tell it the run directory and to invoke the named skill with every default filename prefixed by `./<run-slug>/`, and have it return a short report (artifacts written, assumptions, status) rather than its full transcript; carry only that report forward. A cast loop phase runs **one subagent per iteration** — each advances a single step and returns its done-signal, and you inspect that signal to decide whether to spawn the next iteration. Branch phases run their whole fallback chain in one subagent. MANUAL (un-cast) phases are never delegated — including MANUAL loop phases — so handle those yourself regardless of the per-iteration rule above.
- `--checkpoint` — commit after every phase so the run directory's git history is a per-step record (a data source for workflow-implementation visualizations). When set, `git init ./<run-slug>/` during working-directory setup — this is a standalone per-run repo; do not add it to any surrounding repo you are working inside. Write `./<run-slug>/.gitignore` in the same step holding `dashboard.html`, `run-manifest.json`, and `.omc/`, so a later reading tool cannot land in the history it reads. Then after each phase's artifact is confirmed run `git -C ./<run-slug>/ add -A && git -C ./<run-slug>/ commit -m "phase <n>: <skill>"`. Loop phases commit **once per iteration** (`phase <n> step <k>: <skill>`); for a MANUAL loop, commit once per by-hand step. Keep the subject grammar exactly — `phase <n>: <skill>` and `phase <n> step <k>: <skill>`, with any note in parentheses after it — because it is parsed. With `--use-subagents`, the subagent does the work and returns; you make the commit.
- `--feedback` — create `./<run-slug>/foundry-feedback.ledger.yml` before phase 1. Set `run.pipeline` to this pipeline's slug and `run.run_slug` to the chosen run slug. Copy the complete top-level roster from `_assembly.json` with `run.status: running` and every phase `pending`; set a phase `running` immediately before it starts and `done` after success. Keep one row per loop and increment `iterations`; record a branch's chosen path as `selected`. Pass the same ledger path to every skill and subagent. Before marking a phase `done`, require its feedback outcome — appended entry ids or an explicit `no feedback` — and record `feedback_checked: true` on that row; under `--use-subagents` the subagent's short report carries that line. Do the same pass yourself for a MANUAL phase, naming the pipeline source as the subject when the harness is what needs to change. On a terminating error mark the phase and run `failed`; on a graceful stop mark the run `cancelled`; after every intended phase is done mark the run `complete`. Never describe an empty incomplete ledger as a clean run.

## Working directory (do this first)

Every constituent skill writes fixed filenames to its working directory. To keep one run's artifacts namespaced and avoid clobbering a prior run (foundry#282):

1. Pick a run slug — use the harness argument if given; else ask the user for a short project name up front (the directory must exist before phase 1 writes its first artifact, so don't wait for a source title); else default `galaxy-workflow-review-run`.
2. Create `./<run-slug>/` in the current directory. If it exists, suffix `-2`, `-3`, … . If invoked with `--checkpoint`, run `git init ./<run-slug>/` now and write its `.gitignore` (see Run options).
3. Run **every** skill invocation below with `./<run-slug>/` as its working directory: **prefix every default input and output filename with `./<run-slug>/`** when you invoke the skill. The skills preserve their declared basenames and honor a harness-supplied directory; you supply the prefix on **both reads and writes**, so each phase finds the prior phase's output and nothing lands in the repo root.
4. Create `./<run-slug>/foundry-run.yml` now, before phase 1 writes anything (see Run record below).

Announce the chosen directory before starting.

## Run record (keep this current)

Maintain `./<run-slug>/foundry-run.yml` for the whole run. It is not optional and has no flag: it is how anything reading this run afterwards knows what it was.

- **Create it during working-directory setup**, before phase 1. Set `run_record_version: 1`, `pipeline: galaxy-workflow-review`, `run_slug` to the chosen slug, `harness_name` and `source_revision` from `_assembly.json`, `assembly_sha256` to the sha256 of that file, `foundry_head` to the Foundry commit you are reading, `started_at` to now, `status: running`, and `phases` to the complete roster from `_assembly.json` with every phase `pending`.
- **Set a phase `running`** immediately before invoking it, and `done` once you have confirmed its artifacts exist.
- **Append one `artifacts` row per file a phase writes**: `{ id, file, at }` using the artifact id and basename the skill declares. A loop phase stays one row, increments `iterations`, and adds a row per iteration that writes, carrying `iteration: <k>`.
- **Record a branch's outcome** as `selected: <chain member>` on that phase's row.
- **Close it in `## Done`**: set `finished_at` and the final `status` — `complete` when every intended phase is done, `failed` when a phase terminated the run, `cancelled` on a graceful stop. Leave it `running` on a hard interruption rather than inventing a recovery write.
- Under `--use-subagents` the subagent does the work and reports; **you** write the record. Do the same pass yourself for a MANUAL phase.

## Pipeline

Run these phases in order. After each, confirm the expected artifact exists in the run directory before advancing.

1. **summarize-galaxy-workflow** — invoke the `summarize-galaxy-workflow` skill. Read an existing Galaxy gxformat2 (or .ga) workflow and emit a structured summary for interview and change-set steps.
2. **validate-galaxy-workflow** — invoke the `validate-galaxy-workflow` skill. Run terminal gxwf validation on an assembled Galaxy workflow and classify workflow-level failures.
3. **run-workflow-test** — invoke the `run-workflow-test` skill. Execute a workflow's tests via Planemo; emit structured pass/fail and outputs.
4. **review-galaxy-workflow** — invoke the `review-galaxy-workflow` skill. Apply the pinned upstream IWC review policy to one Galaxy workflow or pull request and emit one evidenced advisory Markdown review.

## Done

Report the final artifacts in `./<run-slug>/`.

Close `./<run-slug>/foundry-run.yml` first: set `finished_at` and the final `status`, and make sure every phase row carries the artifacts it wrote. A run whose record still says `running` is one nothing downstream can read honestly.

If the run was invoked with `--feedback`, close the ledger first: set the final `run.status`, then tell the user the ledger path `./<run-slug>/foundry-feedback.ledger.yml` and how many entries it holds. If it holds any, offer to run the `report-foundry-run-feedback` skill on it, which triages them into local drafts and files nothing without explicit confirmation. Report an empty ledger as "no feedback recorded", never as evidence the Foundry worked well.

## Notes

- Do not re-implement any skill's internal logic here; this harness only sequences and routes.
- Carry unresolved assumptions forward as notes rather than inventing missing inputs.
- Resolve the pull request or local worktree first and record repository, pull request number, base and head SHAs, workflow directory, primary descriptor, and the matching workflow test file.
- The local worktree commit must equal the reviewed head SHA. On mismatch, stop before phase 3 rather than mixing test evidence from one revision with a review of another.
- Phase 3 executes the checkout, so require the caller's explicit confirmation that this checkout is trusted for Planemo execution, and record that decision, before phase 3 runs.
- v1 has no privileged hosted execution of arbitrary fork heads. A user may inspect such a pull request without this Pipeline; running phase 3 always needs the explicit trusted-worktree decision.
- Validation or test failure is evidence for the final review. Retain the result artifact and continue to the review phase rather than losing the review entirely.
- A missing or unrunnable test still reaches phase 4 as an explicit non-passing result — never as a pass, and never as an abort.
- Foundry provenance — an open-requirements ledger, an existing IWC exemplar comparison, source and design handoffs — is optional enrichment the harness supplies. Its absence never fails the IWC review.
- This Pipeline is local and on-demand. It does not post a GitHub review, approve, comment, label, push, mark ready, or merge.
