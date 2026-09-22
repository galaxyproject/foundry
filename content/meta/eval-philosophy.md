---
type: meta
title: "Eval Philosophy"
record_kind: foundation
order: 7
tags:
  - meta
status: reviewed
created: 2026-06-14
revised: 2026-07-29
revision: 3
summary: "Why eval.md is an abstract oracle and scenarios.md holds the concrete cases, and the eval/scenario/refinement split."
---

**`eval.md` is an oracle.** It defines properties that can judge any output from a Mold. The concrete inputs and expected values belong in `scenarios.md`. This separation keeps the checks reusable as fixtures change and as a Mold runs in different journeys.

[[mold-spec]] defines the file layout, case shapes, and validator checks. This page explains the reasoning behind that contract.

## Put properties in eval, cases in scenarios

For a sorting function, the property is "the output contains the same elements in nondecreasing order." It applies to every input. The assertion `sort([3,1,2]) == [1,2,3]` applies to one input and belongs in a concrete case. The same distinction governs Foundry evaluations:

| File | What it contains | Example |
| --- | --- | --- |
| `eval.md` | A fixture-independent property for judging output | Every `processes[].tool` refers to an entry in `tools[]`. |
| `scenarios.md` | An input or fixture and its expected values | CalliNGS-NF has 11 processes. |

The split lets one property check many inputs. It also lets one pipeline scenario, such as `nf-core/sarek` run through 5 steps, meet several oracles. Each Mold's `eval.md` judges its own output, while the scenario names the journey input once. Fixture paths, pinned outputs, and corpus details can change without rewriting those properties.

Foundry's early eval files combined fixtures with checks. That made fixture-specific assertions easy to misfile as general rules. "sarek yields 17 sample-sheet columns" belongs in `scenarios.md`, as does "bacass `summary.json` is byte-identical to the committed pin." "Output is deterministic across re-runs" belongs in `eval.md`. **If a check names a particular fixture or expected value, place it in `scenarios.md`.**

## Check behavior without prescribing the solution

An eval property states what must hold, while leaving room for valid implementations. For example, "`secondaryFiles` surface as an open question or a composite-dataset note" detects silent loss. Requiring `secondaryFiles` to use Galaxy composite datatypes would commit the downstream Mold to one design.

This flexibility matters at Mold handoffs. A downstream Mold may simplify, rename, or restructure the upstream material. A useful fidelity check asks whether the output **silently contradicts a high-confidence upstream decision**. Requiring every item in the upstream brief to reappear would reject legitimate changes in detail.

Many useful properties guard against plausible fabrication or omission in a Mold's output. Check that Tool Shed IDs and step IDs are grounded, and that `pickValue` markers, `ExpressionTool` steps, and branch-control parameters such as `skip_trim` are retained or explicitly flagged when relevant. A property should catch silent disappearance without requiring one fixture's exact output.

## Give each property a failure case

Before adding a property, picture an output that would fail it. If there is no pass/fail edge, put the material where it serves its actual purpose:

- A description of what a run tends to look like belongs in the Mold body or `examples/`.
- An unresolved design question, such as "is field X pulling weight?", belongs in `refinement.md`.
- A fixture with an expected value belongs in `scenarios.md`.
- An instruction already stated in `index.md`, such as "produce X", needs no duplicate eval property.

An eval property earns its place by catching a failure the procedure alone may not prevent. [[mold-spec]] gives the contract for each companion file.

## Execute deterministic checks

Each `eval.md` property declares `check: deterministic` or `check: llm-judged`. A deterministic check receives a verdict only after its named oracle runs. That oracle may be a schema validator, a structural diff, `gxwf validate` or `roundtrip`, or `planemo test`. Describing what the command would report is no verdict. If the trial cannot run the required check, report the trial as **blocked**. Use reasoned inspection for properties marked `llm-judged`.

For example, `run-workflow-test` can use `planemo test` to start a Planemo-managed Galaxy. The absence of an already running Galaxy does not justify skipping that check. See `/test-drive` step 4.

## Evaluate pipelines at both levels

A Pipeline combines its member Molds' evaluations with a small pipeline-level oracle:

- **At each Mold:** apply its `eval.md` to its output as the journey advances. Judge a `[loop]` phase at its endstate. A `[branch]` phase has no oracle of its own, so apply the chosen Mold's oracle.
- **Across the journey:** use the Pipeline's `eval.md` for end-to-end properties that no single Mold owns. For example, the final gxformat2 workflow validates and round-trips, and the source's scientific intent reaches the target without silent contradiction. The Pipeline's `scenarios.md` names the journey input once.

See `content/meta/architecture.md` for the layout and resolution of Pipeline companion files.
