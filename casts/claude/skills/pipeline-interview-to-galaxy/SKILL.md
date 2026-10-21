---
name: pipeline-interview-to-galaxy
description: "Interview-driven path to a Galaxy gxformat2 workflow — orchestrates the Foundry skills of the INTERVIEW → GALAXY pipeline in order, in a per-run working directory."
---

# pipeline-interview-to-galaxy

Harness for the **INTERVIEW → GALAXY** Foundry pipeline. Runs the constituent skills in order inside a single per-run working directory. Assembled from `content/pipelines/interview-to-galaxy/index.md` (revision 6) — regenerate with `foundry-build assemble-pipeline interview-to-galaxy` if the pipeline changes; do not hand-edit.

## When To Use

- Interview-driven path to a Galaxy gxformat2 workflow. Writes a Workflow Brief internally and builds from it with no expert review stop.

## Bootstrap (install these CLIs first)

Install the harness CLIs every constituent skill invokes before driving the pipeline. Deduped across all phases; bioinformatics tools the constructed workflow installs are out of scope (the discovery phase pins those).

- **`foundry`** (foundry). `npm install -g @galaxy-foundry/gxwf-foundry`.
  Ephemeral run: `npx --package @galaxy-foundry/gxwf-foundry foundry`.
  Check: `foundry --help`.
  Docs: https://github.com/galaxyproject/foundry/blob/main/packages/gxwf-foundry/README.md
- **`galaxy-tool-cache`** (galaxy-tool-cache). `npm install -g '@galaxy-tool-util/cli@^1.14.0'`.
  Ephemeral run: `npx --yes --package @galaxy-tool-util/cli@1.14.0 galaxy-tool-cache`.
  Check: `galaxy-tool-cache --help | grep -q summarize`.
  Docs: https://github.com/jmchilton/galaxy-tool-util-ts/tree/main/packages/cli
- **`gxwf`** (gxwf). `npm install -g '@galaxy-tool-util/cli@^1.14.0'`.
  Ephemeral run: `npx --yes --package @galaxy-tool-util/cli@1.14.0 gxwf`.
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

1. Pick a run slug — use the harness argument if given; else ask the user for a short project name up front (the directory must exist before phase 1 writes its first artifact, so don't wait for a source title); else default `interview-to-galaxy-run`.
2. Create `./<run-slug>/` in the current directory. If it exists, suffix `-2`, `-3`, … . If invoked with `--checkpoint`, run `git init ./<run-slug>/` now and write its `.gitignore` (see Run options).
3. Run **every** skill invocation below with `./<run-slug>/` as its working directory: **prefix every default input and output filename with `./<run-slug>/`** when you invoke the skill. The skills preserve their declared basenames and honor a harness-supplied directory; you supply the prefix on **both reads and writes**, so each phase finds the prior phase's output and nothing lands in the repo root.
4. Create `./<run-slug>/foundry-run.yml` now, before phase 1 writes anything (see Run record below).

Announce the chosen directory before starting.

## Run record (keep this current)

Maintain `./<run-slug>/foundry-run.yml` for the whole run. It is not optional and has no flag: it is how anything reading this run afterwards knows what it was.

- **Create it during working-directory setup**, before phase 1. Set `run_record_version: 1`, `pipeline: interview-to-galaxy`, `run_slug` to the chosen slug, `harness_name` and `source_revision` from `_assembly.json`, `assembly_sha256` to the sha256 hex digest of that file, `foundry_head` to the Foundry commit you are reading (`null` when the Foundry is not a git checkout), `started_at` to now, `finished_at: null`, and `status: running`. Quote both shas: an unquoted all-digit sha reads back as a number and is discarded.
- **Copy the phase roster** into `phases`: one row per entry of `_assembly.json`'s top-level `phases`, keyed `n:` (that entry's `phase` number), with `kind`, then `skill` for a mold or `pattern` for a branch, `status: pending`, and `artifacts: []`. A loop row later gains `iterations`, a branch row `selected`. Phase 1 reads `{ n: 1, kind: mold, skill: interview-to-freeform-summary, status: pending, artifacts: [] }`.
- **Set a phase `running`** immediately before invoking it, and `done` once you have confirmed its artifacts exist.
- **Append one `artifacts` row per file a phase writes**: `{ id, file, at }` using the artifact id and basename the skill declares. A loop phase stays one row, increments `iterations`, and appends a row for each iteration that writes, carrying `iteration: <k>`.
- **Record a branch's outcome** as `selected: <chain member>` on that phase's row.
- **Close it in `## Done`**: set `finished_at` and the final `status` — `complete` when every intended phase is done, `failed` when a phase terminated the run, `cancelled` on a graceful stop. Leave it `running` on a hard interruption rather than inventing a recovery write.
- Under `--use-subagents` the subagent does the work and reports; **you** write the record. Do the same pass yourself for a MANUAL phase.

## Pipeline

Run these phases in order. After each, confirm the expected artifact exists in the run directory before advancing.

1. **interview-to-freeform-summary** — invoke the `interview-to-freeform-summary` skill. Normalize a free-form user interview into the shared freeform-summary workflow handoff.
2. **freeform-summary-to-workflow-brief** — invoke the `freeform-summary-to-workflow-brief` skill. Turn a freeform source summary and selected scope into a Workflow Brief without Galaxy design assumptions.
3. **workflow-brief-to-galaxy-interface** — invoke the `workflow-brief-to-galaxy-interface` skill. Map a Workflow Brief into a Galaxy workflow interface design brief, consulting retained source evidence when available.
4. **workflow-brief-to-galaxy-data-flow** — invoke the `workflow-brief-to-galaxy-data-flow` skill. Translate a Workflow Brief and its Galaxy interface into a Galaxy data-flow design brief.
5. **compare-against-iwc-exemplar** — invoke the `compare-against-iwc-exemplar` skill. Find nearest IWC exemplar(s) and surface a structural diff against the upstream Galaxy design briefs to guide template authoring.
6. **workflow-brief-to-galaxy-template** — invoke the `workflow-brief-to-galaxy-template` skill. Build a gxformat2 skeleton from a Workflow Brief and its Galaxy design briefs, consulting retained source evidence.
7. **advance-galaxy-draft-step** (loop) — invoke the `advance-galaxy-draft-step` skill, once per step. It owns its own endstate oracle (`gxwf draft-next-step`) and concretizes one drafty step per call; re-invoke until it reports `draft: false`, then it extracts the concrete `galaxy-workflow.gxwf.yml` (via `gxwf draft-extract`) and continues.
8. **test-data-resolution** (branch) — resolve in order; stop at the first that yields acceptable output:
   - Try `find-test-data` — Search IWC fixtures and public sources for test data matching a data-flow shape.
   - **user-supplied** — if nothing above yields acceptable output, ask the user to supply it directly.
9. **workflow-brief-to-galaxy-test-plan** — invoke the `workflow-brief-to-galaxy-test-plan` skill. Synthesize a Galaxy workflow test plan from a Workflow Brief, its Galaxy design briefs, and available source evidence.
10. **implement-galaxy-workflow-test** — invoke the `implement-galaxy-workflow-test` skill. Assemble Galaxy workflow test fixtures and assertions.
11. **validate-galaxy-workflow** — invoke the `validate-galaxy-workflow` skill. Run terminal gxwf validation on an assembled Galaxy workflow and classify workflow-level failures.
12. **run-workflow-test** — invoke the `run-workflow-test` skill. Execute a workflow's tests via Planemo; emit structured pass/fail and outputs.
13. **debug-galaxy-workflow-output** — invoke the `debug-galaxy-workflow-output` skill. Triage failing Galaxy run outputs; classify the failure surface and capture evidence before recommending repairs.

## Done

Report the final artifacts in `./<run-slug>/` and any phases handled manually (marked MANUAL above).

Close `./<run-slug>/foundry-run.yml` before anything else: set `finished_at` and the final `status`, and make sure every phase row carries the artifacts it wrote. A run whose record still says `running` is one nothing downstream can read honestly.

If the run was invoked with `--feedback`, close the ledger next, after the run record: set the final `run.status`, then tell the user the ledger path `./<run-slug>/foundry-feedback.ledger.yml` and how many entries it holds. If it holds any, offer to run the `report-foundry-run-feedback` skill on it, which triages them into local drafts and files nothing without explicit confirmation. Report an empty ledger as "no feedback recorded", never as evidence the Foundry worked well.

## Notes

- Do not re-implement any skill's internal logic here; this harness only sequences and routes.
- Carry unresolved assumptions forward as notes rather than inventing missing inputs.
- v1 "workflow" means a Galaxy `gxformat2` workflow. The live interview mechanics are harness-owned and precede phase 1.
- The interview supplies the desired objective and selected scope. Ambiguous selection becomes a Workflow blocker rather than an agent choice.
- After phase 2, run `foundry validate-workflow-brief workflow-brief.md` and `foundry check-workflow-brief workflow-brief.md --json`, and run the check again whenever resuming. A failed validation or check exit 1, 3, or 4 stops before design, with the brief reported as an honest blocked result.
- This route has no expert review. Record in the run record that workflow-brief.md went to design with no expert review and its proposals accepted by default. Before phase 3, perform current environment preflight for required tooling, versions, workspace access, and usable container engines. Failed preflight stops the run.
- Treat workflow-brief.md as unchanged from the end of phase 2 through every later phase. Record its hash when phase 2 finishes and check it after each phase and loop iteration and on resumption. A mismatch stops the run.
- Record durable workflow knowledge in open-requirements.ledger.yml. Because no expert reviewed the brief, the interface Mold records each open question it adopts from a proposal with `basis: unreviewed-proposal`. A later Mold that finds one wrong supersedes it with its own decision and keeps going. A change to the brief's objective, scope, or requirements is still a proposed brief-change recommendation, and the run stops when correctness depends on it.
- The brief governs scientific scope. Keep freeform-summary.md and the interview record available. Design Molds may consult them as evidence, and they never broaden scope.
- Phase 8 resolves test data with find-test-data, then caller-supplied fixtures.
- When reporting at Done, list every Workflow Brief open question recorded in open-requirements.ledger.yml with the answer the run used and its basis, low-confidence answers first, followed by every proposed brief-change recommendation. Tell the user these answers were never reviewed. To change one, they edit workflow-brief.md, review it, and rerun from the brief with `pipeline-workflow-brief-to-galaxy`.
