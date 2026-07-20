---
description: Drive an emulated end-to-end test of one or more Molds against a real fixture, evaluate against eval.md, and capture refinements.
argument-hint: "<scenario description>"
---

# Test-drive

Run a Mold or chain of Molds against real input, evaluate the outputs, and harvest refinement notes. Open-ended by design — the user describes the scenario; you figure out which fixtures, which Molds, which prior artifacts apply.

`$1` is a free-form scenario. Examples:

- "5-step nextflow→galaxy on nf-core/sarek"
- "summarize-nextflow on nf-core/rnaseq, just the test_fixtures section"
- "data-flow + template Molds on the existing nf-core/demo emulation outputs"
- "implement-galaxy-tool-step on a single sarek process row, BWA_MEM"
- "compare-against-iwc-exemplar against the bacass briefs we already have"

The shape of "test-drive" is the same regardless: ensure inputs exist, run the relevant Mold(s) by emulation (read the cast bundle's `SKILL.md` and follow it), evaluate, capture refinements. Don't impose a fixed N-step pipeline; let the scenario decide.

**"By emulation" refers to skill *dispatch* only** — you read the bundle's `SKILL.md` and follow it instead of invoking it through the `Skill` tool (see the closing note). It does **not** license emulating the *work*. Following the SKILL means doing what it says: for an authoring Mold that is you writing the artifact; for an **executable** Mold (`validate-galaxy-workflow`, `run-workflow-test`, …) it is running the tool the SKILL names — for real (see step 4).

## 0. Read the scenario

Parse `$1` and figure out:

- Which Mold(s) are in scope. Cross-reference `docs/HARNESS_PIPELINES.md` and `content/pipelines/<slug>/index.md` only as a lookup — don't force the run into a pipeline shape if the scenario is narrower.
- Whether `$1` names a `scenarios.md` case — a Mold's `content/molds/<mold>/scenarios.md` `## Case: <name>`, or a pipeline's `content/pipelines/<pipeline>/scenarios.md` case. If so, bind that case's fixture and carry its `expect:` assertions into step 5. Otherwise the scenario is ad-hoc and you pick the fixture.
- What input artifacts each Mold needs and where they should come from — a fixture, a prior emulation run, a freshly-produced upstream artifact, or the user's hands.
- What's already on disk vs what needs producing.

If the scenario is ambiguous (which fixture? which scope cut? which prior run to start from?) ask before running. If the scenario implies a chain that's longer than the user clearly wants, ask about scope.

## 1. Ensure fixtures

For each input the scenario needs, check it's materialized:

- Nextflow source trees: `workflow-fixtures/pipelines/<owner>__<repo>/main.nf`. Run `make fixtures-nextflow` if absent. Don't run it twice in parallel — there's a known git-lock collision when concurrent runs hit the same checkout.
- IWC corpus: `~/projects/repositories/workflow-fixtures/iwc-format2/` (shared mirror) or `workflow-fixtures/iwc-format2/` (local). Run `make fixtures-iwc fixtures-skeletons` if absent.
- Prior emulation outputs: `casts/claude/_emulated-runs/<run-id>/`. If the scenario refers to one and it's missing, surface the gap and stop — don't fabricate an upstream brief.

If a fixture target fails (e.g. the `summarize-nextflow` package CLI hasn't been built), build what's needed first: `pnpm --filter @galaxy-foundry/summary-nextflow-schema build && pnpm --filter @galaxy-foundry/summarize-nextflow build`. Surface failures explicitly; don't paper over them.

## 2. Ensure casts current

For each Mold in scope, check its cast bundle is in sync with `content/molds/<mold>/index.md`:

```sh
npm run cast -- <mold> --target=claude --check
```

If `--check` reports drift, run without `--check` to reconcile, then `npx tsx scripts/cast-skill-verify.ts <mold> --target=claude`. If LLM follow-up is required (any `pending_llm: true` ref), do that work per `.claude/commands/cast.md` step 4.

If casts changed in a way that would matter to runtime skill invocation (i.e., this branch will be merged and other agents will pick the skills up), remind the user: **"casts updated — `/reload-plugins` if you want a future session to invoke these as real skills, otherwise emulation in-session is fine."**

## 3. Prepare the run dir

Pick a scenario slug — e.g. `nf-core-sarek`, `nf-core-rnaseq-summary-only`, `bwa-mem-tool-step`. Create:

```
casts/claude/_emulated-runs/<scenario-slug>/
```

Run-dir contents are **not committed**. They're research artifacts. `_emulated-runs/` is gitignored or treated as such; if the user wants a baseline pinned for regression checks, they pass `--commit` (not implemented today; surface as future work if a regression-check use case arises).

## 4. Drive the Mold(s)

For each Mold in scope, in order:

- Read `casts/claude/skills/<mold>/SKILL.md` in full.
- Read referenced files under `casts/claude/skills/<mold>/references/` *only as their `load:` and `trigger:` directives say to* — load-on-demand notes are loaded only when the trigger applies. Treat the skill bundle as a runtime contract.
- Read upstream artifacts the Mold's `Inputs` section names. If the scenario points to existing inputs, use them; if the prior step in this run produced them, consume those.
- Produce the Mold's declared `Outputs` artifact at the run dir. Use the default filename unless the user overrode.
- **Authoring vs executable Molds.** An *authoring* Mold (summarize, interview→changeset, a `*-to-galaxy-*` brief, test-plan) is exercised by you following its `SKILL.md` — the LLM authoring *is* the work. An *executable* Mold runs a tool, and you **must run that tool**, not describe its result:
  - `validate-galaxy-workflow` → `gxwf validate` / `draft-validate` / `roundtrip`.
  - `run-workflow-test` → `planemo test`. Planemo is **self-bootstrapping**: `planemo test` launches its own ephemeral Galaxy and installs the workflow's tools from the Tool Shed/conda — no external server, so "no running Galaxy" is never a reason to skip. Remote-URL test data is fetched by planemo. Deferring the run is allowed **only** for a specific, named heavy cost (a multi-GB reference DB, an outsized tool install) and must be recorded as an explicit gap in the run summary — never a silent "not run".
  - For Molds that ship a CLI implementation (e.g. `summarize-nextflow`), prefer the CLI over LLM emulation.
- Note in the run summary which Molds ran by CLI/tool vs by authoring.

If a Mold's procedure depends on a decision that's not in the source evidence (scope cuts, sibling-vs-flag, narrow-the-DAG), make the decision honestly, surface it as a top-level "Scope decision" or "Open question" in the artifact, and continue. Do not ask the user mid-chain unless the decision is irreducible — collect questions, surface them at the end.

## 5. Evaluate: apply `eval.md` properties to the scenario output

Two files split the work (see `docs/EVAL_PHILOSOPHY.md`): `eval.md` is the **abstract oracle** (`## Property:` sections — how to judge any output), `scenarios.md` is the **concrete cases** (`## Case:` sections — fixture + expected values).

For each Mold the run exercised:

- Read `content/molds/<mold>/eval.md` (properties) and `content/molds/<mold>/scenarios.md` (cases).
- The run bound a scenario — either a named `scenarios.md` case or an ad-hoc one from `$1`. Apply **every** `eval.md` property to the produced output: ✅, ❌, or N/A (a property this scenario didn't exercise).
- Also check the bound scenario's own `expect:` assertions — the fixture-specific expected values (e.g. "11 processes").
- A property whose check is **deterministic** (`bucket: schema`, or any `check: deterministic` in `eval.md` — schema validation, a structural diff, `gxwf validate` / `roundtrip`, a `planemo test` run) is scored by **running the check**. It may not be marked ✅, N/A, or ⚠️ by inspection or emulation, and "not run" on a deterministic property is a trial failure, not a pass. For `bucket: utility` / `llm-judged`, score by inspection.

In addition to Mold specific eval.md instructions, evaluate
each skill run at a high-level. Does the Mold output seem appropriate for the job being done. Evaluate what research
was used, whether it was useful, and what research was missing. Exposing gaps in research (missing/incorrect research within a document or missing documents) is an
an important aspect of the evaluation step.

Report eval results in a table; don't paper over misses. Misses are the point of the run.

### Pipeline runs: composition + a pipeline oracle

When the scenario is a whole pipeline (driven by `/test-pipeline`), evaluation is two-layered:

- **Composition — eval between each step.** As the journey advances phase by phase (per the pipeline `index.md` `phases:` spine), apply each member Mold's `eval.md` properties to *that step's* output, before feeding it downstream. A miss at step N is more valuable caught at step N than at the end.
  - A `[loop]` phase (e.g. `advance-galaxy-draft-step`) is judged at its **endstate**, not per iteration: let the loop run until its own oracle (`gxwf draft-next-step`) reports no drafty steps remain, then evaluate the concretized result.
  - A `[branch]` phase carries no `eval.md` of its own; evaluate the **chosen** Mold's `eval.md` for whichever branch was taken.
- **Pipeline oracle — end to end.** After the journey completes, apply `content/pipelines/<pipeline>/eval.md` (the cross-step / end-to-end properties: final workflow validates and round-trips, source intent survived, etc.) and the bound `content/pipelines/<pipeline>/scenarios.md` case's `expect:` assertions.

Report per-step eval results and the pipeline-level eval in the same table, grouped by phase.

## 6. Capture refinements

For each Mold that hit a real gap (eval miss, awkward decision, cast skill insufficient, schema field underspecified), prompt to write a refinement journal entry at:

```
content/molds/<mold>/refinements/<YYYY-MM-DD>-<scenario-slug>.md
```

Frontmatter:

```yaml
---
mold: <mold>
date: <YYYY-MM-DD>
intent: <what this run was testing>
decision: keep | schema-change | reference-change | eval-add | open-question | other
---
```

Body covers: what worked, what gaps surfaced (concrete, with examples), open questions. Keep entries narrow and honest — one run produces one entry per Mold that needs feedback, not a sprawling everything-doc.

## 7. Run summary

Write `casts/claude/_emulated-runs/<scenario-slug>/run-summary.md` capturing:

- Scenario as run (parsed from `$1`).
- Molds exercised, in order; CLI vs emulation per Mold.
- Inputs consumed (fixture pins, prior-run paths).
- Outputs produced (relative paths under the run dir).
- Eval results table.
- Refinement entries written, with decision codes.
- Process observations: fixture-build failures, cast drift, dev-environment surprises, anything that bit during the run.
- Cross-cutting open questions worth tracking in issues.

If the run surfaced concrete bugs in the Mold implementations or schemas (not just refinements), recommend opening GitHub issues; offer to draft them.

## 8. Wrap up

- Summarize what changed on disk (run-dir contents + any refinement journal entries).
- List the open questions in one place; concise, sacrifice grammar for brevity.
- Suggest a follow-up: "run the next phase," "open issues for X / Y," "promote refinement entry → real schema change," "re-run after `/reload-plugins`."

Follow-ups should most likely reflect generalizations of
the lessons learned.

## Notes on emulation vs runtime invocation

A freshly-cast skill is on disk immediately and any `Read`-capable agent can follow its `SKILL.md`. What an in-session agent **can't** do is invoke the skill through the `Skill` tool — that registry is populated at session start (or after `/reload-plugins`). For test-drive we always emulate by reading the bundle, because the goal is to evaluate the bundle's contents and the user told us which Molds to run. Skill-tool invocation matters when an agent has to *discover* the right skill organically; that's not what test-drive is for. **This is the only sense in which test-drive "emulates" — it bypasses skill *dispatch*, not the SKILL's procedure.** Reading the bundle and then running the `gxwf` / `foundry` / `planemo` commands the SKILL prescribes *is* executing the Mold for real; the deterministic phases (validate, run) are run, not described.

If a run reveals that the cast bundle's `SKILL.md` is unclear, the procedure is wrong, or the references don't load when they should — that's a refinement entry, not a re-cast. Re-casting fixes the bundle; the refinement explains *why* the bundle needed fixing.
