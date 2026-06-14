---
description: Test-drive a whole pipeline against a scenarios.md journey — run the Mold chain, evaluate between each step and end to end.
argument-hint: "<pipeline> [scenarios.md case name or description]"
---

# Test-pipeline

Scoped entry point into `/test-drive` for a whole pipeline journey. `$1` is `<pipeline-slug> [case]`.

This is `/test-drive` over a pipeline's Mold chain, with evaluation **between each step** (composition) and a **pipeline-level oracle** at the end. Follow `.claude/commands/test-drive.md`; this file fixes the scope, the phase order, and the scenario source. See `docs/EVAL_PHILOSOPHY.md` for why the two layers exist.

## Bind

- **Pipeline** — first token of `$1` → `content/pipelines/<pipeline>/index.md`. Its `phases:` spine is the journey order.
- **Scenario** — the rest selects a case from `content/pipelines/<pipeline>/scenarios.md` (the journey input, named once for the whole run; it does not re-list per-Mold scenarios). Empty → list cases and ask. Free description → closest/ad-hoc.
- **Oracles** — each member Mold's `content/molds/<mold>/eval.md` (per step) **plus** `content/pipelines/<pipeline>/eval.md` (end to end).

## Run

Walk the `phases:` spine in order, in a single per-run working directory (see `/test-drive` step 3):

- **Mold-shaped phase** — drive the Mold's cast (step 4), then immediately apply that Mold's `eval.md` to the step output *before* feeding it downstream (step 5 → "Pipeline runs"). Catch a miss at the step that produced it, not three phases later.
- **`[loop]` phase** — run the looped Mold until its own oracle reports done (e.g. `advance-galaxy-draft-step` → `gxwf draft-next-step`); evaluate at the **endstate**, not per iteration.
- **`[branch]` phase** — route per the named pattern (e.g. `discover-or-author`); evaluate the **chosen** Mold's `eval.md`.
- **End of journey** — apply the pipeline `eval.md` end-to-end properties + the bound case's `expect:` assertions.

## Report

One table grouped by phase: per-step Mold eval, then the pipeline-level eval. Capture refinements per Mold, and one for the pipeline if a cross-step gap surfaced (step 6); write a run summary (step 7). Misses — especially a step that only fails *downstream* — are the point of the run.
