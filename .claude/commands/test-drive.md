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

## 0. Read the scenario

Parse `$1` and figure out:

- Which Mold(s) are in scope. Cross-reference `docs/HARNESS_PIPELINES.md` and `content/pipelines/*.md` only as a lookup — don't force the run into a pipeline shape if the scenario is narrower.
- What input artifacts each Mold needs and where they should come from — a fixture, a prior emulation run, a freshly-produced upstream artifact, or the user's hands.
- What's already on disk vs what needs producing.

If the scenario is ambiguous (which fixture? which scope cut? which prior run to start from?) ask before running. If the scenario implies a chain that's longer than the user clearly wants, ask about scope.

## 1. Ensure fixtures

For each input the scenario needs, check it's materialized:

- Nextflow source trees: `workflow-fixtures/pipelines/<owner>__<repo>/main.nf`. Run `make fixtures-nextflow` if absent. Don't run it twice in parallel — there's a known git-lock collision when concurrent runs hit the same checkout.
- IWC corpus: `~/projects/repositories/workflow-fixtures/iwc-format2/` (shared mirror) or `workflow-fixtures/iwc-format2/` (local). Run `make fixtures-iwc fixtures-skeletons` if absent.
- Prior emulation outputs: `casts/claude/skills/_emulated-runs/<run-id>/`. If the scenario refers to one and it's missing, surface the gap and stop — don't fabricate an upstream brief.

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
casts/claude/skills/_emulated-runs/<scenario-slug>/
```

Run-dir contents are **not committed**. They're research artifacts. `_emulated-runs/` is gitignored or treated as such; if the user wants a baseline pinned for regression checks, they pass `--commit` (not implemented today; surface as future work if a regression-check use case arises).

## 4. Drive the Mold(s)

For each Mold in scope, in order:

- Read `casts/claude/skills/<mold>/SKILL.md` in full.
- Read referenced files under `casts/claude/skills/<mold>/references/` *only as their `load:` and `trigger:` directives say to* — load-on-demand notes are loaded only when the trigger applies. Treat the skill bundle as a runtime contract.
- Read upstream artifacts the Mold's `Inputs` section names. If the scenario points to existing inputs, use them; if the prior step in this run produced them, consume those.
- Produce the Mold's declared `Outputs` artifact at the run dir. Use the default filename unless the user overrode.
- For Molds with a CLI implementation (e.g. `summarize-nextflow` ships `@galaxy-foundry/summarize-nextflow`), prefer the CLI over LLM emulation. Note in the run summary which Molds ran by CLI vs by emulation.

If a Mold's procedure depends on a decision that's not in the source evidence (scope cuts, sibling-vs-flag, narrow-the-DAG), make the decision honestly, surface it as a top-level "Scope decision" or "Open question" in the artifact, and continue. Do not ask the user mid-chain unless the decision is irreducible — collect questions, surface them at the end.

## 5. Evaluate against `eval.md`

For each Mold the run exercised:

- Read `content/molds/<mold>/eval.md`.
- For each case, decide whether the run satisfies it: ✅, ❌, or N/A (case targets a fixture or scope this run didn't exercise).
- For cases tagged `bucket: schema`, run the deterministic check (e.g. `validate-summary-nextflow`) where applicable.
- For cases tagged `bucket: utility` / `llm-judged`, score by inspection.

In addition to Mold specific eval.md instructions, evaluate
each skill run at a high-level. Does the Mold output seem appropriate for the job being done. Evaluate what research
was used, whether it was useful, and what research was missing. Exposing gaps in research (missing/incorrect research within a document or missing documents) is an
an important aspect of the evaluation step.

Report eval results in a table; don't paper over misses. Misses are the point of the run.

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

Write `casts/claude/skills/_emulated-runs/<scenario-slug>/run-summary.md` capturing:

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

A freshly-cast skill is on disk immediately and any `Read`-capable agent can follow its `SKILL.md`. What an in-session agent **can't** do is invoke the skill through the `Skill` tool — that registry is populated at session start (or after `/reload-plugins`). For test-drive we always emulate by reading the bundle, because the goal is to evaluate the bundle's contents and the user told us which Molds to run. Skill-tool invocation matters when an agent has to *discover* the right skill organically; that's not what test-drive is for.

If a run reveals that the cast bundle's `SKILL.md` is unclear, the procedure is wrong, or the references don't load when they should — that's a refinement entry, not a re-cast. Re-casting fixes the bundle; the refinement explains *why* the bundle needed fixing.
