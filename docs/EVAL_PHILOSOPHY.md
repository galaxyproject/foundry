# Eval Philosophy

`docs/MOLD_SPEC.md` owns the eval *contract* — the file layout, the case shapes, the validator checklist. This document is the *why* behind it. When a contract rule feels arbitrary, the reasoning is here.

The one-line version: **`eval.md` is an oracle, not a test suite.** It says how to judge any output; it does not enumerate inputs. That single stance generates almost every rule in the contract.

## The eval / scenario split

A Mold's evaluation surface is two files, and the cut between them is the most important idea here.

- **`eval.md` — the abstract checker.** Fixture-independent properties: *how* you judge any output.
- **`scenarios.md` — the concrete cases.** A fixture plus its expected values: *what* you feed in and *what* you expect back.

The sorting analogy makes the line obvious. If you write a sort, the abstract checker says "the output holds the same elements in nondecreasing order" — a property that holds for every input, and is deliberately weaker than naming any one output. You would not bury `sort([3,1,2]) == [1,2,3]` inside that checker; that concrete pair is a test case. `eval.md` is the checker; `scenarios.md` is the table of `(input, expected)` pairs.

Why split them at all, when an eval case could just carry its own fixture and expected value (as the Foundry's early eval files did)?

1. **One oracle, many inputs.** Properties are reusable. "Every `processes[].tool` is a foreign key into `tools[]`" judges a summary of *any* pipeline. Bundling it with one fixture's magic count hides that generality and tempts authors to re-state the property per fixture.
2. **One input, many oracles.** A pipeline scenario (`nf-core/sarek`, 5 steps) flows through every Mold in the journey; each step's `eval.md` judges its own slice of that single run. The scenario is named once; the oracles compose.
3. **Concreteness rots; properties don't.** Fixture paths move, corpora churn, pinned diffs go stale. Quarantining all of that in `scenarios.md` lets `eval.md` stay durable. When a fixture changes, you edit one file, and the oracle is untouched.
4. **It kills the misfiling failure mode.** The recurring drift was agents writing concrete, fixture-bound cases into `eval.md` — "CalliNGS-NF has 11 processes", "sarek yields 17 sample-sheet columns". Those are scenarios. Giving them a real home (`scenarios.md`) plus a stated reason (this doc) is the fix. The contract test is mechanical: *does the entry name a specific fixture or magic value? Then it is a scenario, not eval.*

Regression cases show the split working cleanly. "Output is deterministic across re-runs" is a property → `eval.md`. "bacass `summary.json` is byte-identical to the committed pin" is a concrete case → `scenarios.md`. Same intent, two altitudes.

## Property checks over prescriptive solutions

An eval property should describe a behavior the output must exhibit, not the one solution you have in mind.

"`secondaryFiles` surface as an open question or a composite-dataset note" is a property — it catches silent loss without deciding the fix. "`secondaryFiles` must use Galaxy composite datatypes" is a mandate that locks in one answer and fails a different-but-correct output. Eval should catch silent loss, not pre-decide the design.

This matters because the artifacts under test are *handoffs between Molds*, and handoffs legitimately vary. The downstream Mold can simplify, rename, or restructure and still be correct. Over-specified evals turn that honest variation into false failures, and authors learn to ignore the eval rather than trust it.

The corollary for handoff fidelity: prefer "must not silently contradict a high-confidence upstream decision" over "every input from the upstream brief appears." Drafting *should* add and drop detail; the property guards against silent contradiction, not against change.

## Eval as a guardrail at the Mold boundary

The highest-value properties are hallucination and omission guardrails. Casting and runtime are LLM-driven, and the characteristic failure is not a crash — it is a plausible fabrication or a silent drop. Properties that name a known fabrication source are first-class:

- invented Tool Shed IDs,
- dropped `pickValue` markers,
- evaporated `ExpressionTool` steps,
- fabricated step IDs,
- a branch-control parameter (`skip_trim`) silently folded away.

Frame each as *"X must appear, or be explicitly flagged; it must not silently vanish."* That phrasing is what makes it a property (true of any output) rather than a fixture assertion, and it targets exactly the failure mode the procedural body alone can't prevent.

## If you can't sketch the failure, it isn't eval

Every eval property must have a pass/fail edge — an output you can imagine that violates it. This is the line between eval and the neighboring files.

- No failure edge, just "here's what running this tends to look like"? That's **`usage.md`** — illustration.
- An open design question with no answer yet ("is field X pulling weight?")? That's **`refinement.md`**.
- A concrete fixture and its expected value? That's **`scenarios.md`**.
- A re-statement of the procedural body ("produce X" when `index.md` already says to produce X)? That's nothing — delete it. Eval targets failure modes the body won't prevent.

The four maintainer-facing files decay differently and serve different readers; keeping them separate is what lets each stay honest. `MOLD_SPEC.md` has the per-file contract.

## Pipelines evaluate by composition plus a thin oracle

A Pipeline is judged two ways at once:

- **Composition** — each member Mold's `eval.md` runs against that step's output as the journey advances. A `[loop]` phase is judged at its endstate, not per iteration; a `[branch]` phase carries no oracle of its own, so the chosen Mold's `eval.md` applies.
- **A thin pipeline-level oracle** — the Pipeline's own `eval.md` states the end-to-end and cross-step properties no single Mold owns: the final gxformat2 workflow validates and round-trips; the source's scientific intent survived source → target without silent contradiction. Its `scenarios.md` names the journey input once.

See `docs/ARCHITECTURE.md` for how pipeline companions are laid out and resolved.
