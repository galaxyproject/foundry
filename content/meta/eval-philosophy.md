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

The Foundry judges a Mold's output with reusable properties and concrete cases. The properties live in `eval.md`. Inputs and expected results live in `scenarios.md`. Keeping them separate lets the same property judge many inputs and lets one input travel through several Molds. [[mold-spec]] defines the file contract. This page explains how to apply it.

## Separate the oracle from the case

**`eval.md` is the abstract oracle.** It states properties that any conforming output must satisfy, independent of the input. **`scenarios.md` holds concrete cases.** Each case binds an input or fixture to expected values or assertions.

For a sort, an eval property would say that the result contains the same elements in nondecreasing order. A scenario would say `sort([3,1,2]) == [1,2,3]`. The first check applies to every input. The second checks one input.

This separation pays off in three ways:

1. A property such as “every `processes[].tool` refers to an entry in `tools[]`” can judge a summary of any pipeline without being repeated for each fixture.
2. A pipeline scenario such as `nf-core/sarek`, 5 steps, can pass through the full journey. Each Mold's `eval.md` judges its own output from that run. The input is named once.
3. Fixture paths, corpus contents, and pinned outputs can change while the properties stay useful. Update the case in `scenarios.md` when its fixture changes.

Use the presence of a named fixture or exact expected value as a filing check. “Output is deterministic across re-runs” belongs in `eval.md`. “bacass `summary.json` is byte-identical to the committed pin” belongs in `scenarios.md`. Counts such as “CalliNGS-NF has 11 processes” and “sarek yields 17 sample-sheet columns” are also scenario expectations.

## Write properties that detect failure

A useful eval property describes an observable failure without requiring one particular solution. For example, `secondaryFiles` must appear as an open question or a composite-dataset note. That catches silent loss. Requiring Galaxy composite datatypes would choose a design before the handoff is judged.

Handoffs may simplify, rename, or restructure information. Check that the output does not silently contradict a high-confidence upstream decision. Requiring every detail from the upstream brief to reappear would reject legitimate drafting changes.

Fabrication and omission are especially useful failure targets at a Mold boundary. Check for invented Tool Shed IDs and step IDs, dropped `pickValue` markers, missing `ExpressionTool` steps, and a branch-control parameter such as `skip_trim` silently disappearing. State the property so the information must appear or be explicitly flagged. It must not vanish without explanation.

Every property needs a pass/fail edge: describe an output that would violate it. Then file neighboring material where it belongs:

- A fixture with an expected value goes in `scenarios.md`.
- An unresolved design question, such as whether a field is useful, goes in `refinement.md`.
- An illustration of a run goes in the Mold body or `examples/`.
- A restatement of an instruction already in `index.md` adds no check. Remove it.

## Execute deterministic checks

Each `eval.md` property declares `check: deterministic` or `check: llm-judged`. A deterministic property earns a verdict by running its mechanical oracle, such as a schema validator, structural diff, `gxwf validate` or `roundtrip`, or `planemo test`. Describing the expected tool result does not evaluate the property. If the oracle cannot run, report the trial as blocked. Use reasoned inspection for `llm-judged` properties.

This matters in a test drive of an executable Mold. `run-workflow-test` uses `planemo test`, which launches its own Galaxy. The absence of an already running Galaxy does not justify skipping that check. See `/test-drive` step 4.

## Evaluate pipelines at both levels

A Pipeline combines the properties of its member Molds with a small end-to-end oracle:

- **At each Mold:** Apply its `eval.md` to that step's output. Judge a `[loop]` phase at its endstate. A `[branch]` phase has no oracle of its own, so apply the chosen Mold's properties.
- **Across the journey:** Use the Pipeline's `eval.md` for properties no one Mold owns. For a Galaxy-targeting journey, these include validation and round-trip of the final gxformat2 workflow and preservation of the source's scientific intent without silent contradiction. The Pipeline's `scenarios.md` names the journey input once.

See `content/meta/architecture.md` for the placement and resolution of Pipeline companions, and [[mold-spec]] for the per-file contract.
