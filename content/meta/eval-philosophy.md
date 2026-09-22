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

Use this page when deciding what belongs in a Mold or Pipeline evaluation. **`eval.md` defines properties for judging any output. `scenarios.md` supplies the particular inputs and expected results to judge.** The file layout, case format, and validator checklist are specified in [[mold-spec]]. This page explains why those rules are separate.

## Separate the checker from the test case

For a sorting function, an `eval.md` property could require the output to contain the same elements as the input in nondecreasing order. The case `sort([3,1,2]) == [1,2,3]` belongs in `scenarios.md`. The first statement can judge every input. The second binds one input to one expected result.

The same distinction applies to Foundry outputs:

| Put in | When the statement describes | Example |
| --- | --- | --- |
| `eval.md` | A property that can pass or fail for any applicable input | Every `processes[].tool` refers to an entry in `tools[]`. |
| `scenarios.md` | A named fixture and its expected values or assertions | CalliNGS-NF has 11 processes. |

Early Foundry eval files carried fixtures and expected values together. Separating them makes a property reusable across fixtures and keeps fixture changes in one place. Paths can move, corpora can change, and pinned output comparisons can go stale without changing the rule used to judge outputs.

The separation also works in the other direction. A Pipeline scenario such as `nf-core/sarek` across 5 steps names one journey input. Each Mold's `eval.md` judges its own output from that journey. A fixture-specific claim such as “sarek yields 17 sample-sheet columns” belongs with the scenario, not in each Mold's oracle.

For regression checks, “output is deterministic across re-runs” is an `eval.md` property. “bacass `summary.json` is byte-identical to the committed pin” is a `scenarios.md` case. If a statement names a particular fixture or expected value, put it in the scenario.

## Write properties that allow valid solutions

Describe the behavior that must hold without requiring one implementation. For example, “`secondaryFiles` surface as an open question or a composite-dataset note” catches silent loss. Requiring `secondaryFiles` to use Galaxy composite datatypes would reject another valid way to handle them.

This matters at handoffs between Molds. A downstream Mold may simplify, rename, or restructure an upstream brief. A useful property says that the output must not silently contradict a high-confidence upstream decision. Requiring every input detail to reappear would reject legitimate drafting changes.

Properties should also catch plausible fabrication and omission. Examples include invented Tool Shed IDs, lost `pickValue` markers, missing `ExpressionTool` steps, fabricated step IDs, and a branch-control parameter such as `skip_trim` disappearing. For each applicable item, require the output to preserve it or explicitly flag it. A Mold run can otherwise produce a plausible output that silently drops or invents information.

## Give every property a failure case

Before adding an `eval.md` property, describe an output that would violate it. Then use the statement's purpose to place it:

- A fixture and its expected result belong in `scenarios.md`.
- An unresolved design question, such as “is field X pulling weight?”, belongs in `refinement.md`.
- An illustration of what a run looks like belongs in the Mold body or `examples/`.
- A restatement of an instruction already in `index.md`, such as “produce X,” adds no new check and can be removed.

An eval property earns its place when it detects a failure the procedure alone may not prevent. [[mold-spec]] gives the contract for these companion files.

## Run deterministic checks for real

Each `eval.md` property declares `check: deterministic` or `check: llm-judged`. Score an `llm-judged` property by reasoned inspection. Score a deterministic property by running its stated check, such as schema validation, a structural diff, `gxwf validate` or round-trip, or `planemo test`.

Describing what a validator would report does not establish a deterministic verdict. If a trial cannot run a required check, report the trial as blocked instead of passing the property by inspection. For `run-workflow-test`, `planemo test` starts its own Galaxy, so the absence of an already-running Galaxy is not a reason to skip it. See `/test-drive` step 4 for the run procedure.

## Evaluate Pipelines at each step and end to end

A Pipeline combines its Molds' oracles with a small Pipeline-level oracle:

- As the journey advances, apply each Mold's `eval.md` to that step's output. Judge a `[loop]` phase at its endstate. A `[branch]` phase has no oracle of its own, so apply the chosen Mold's `eval.md`.
- Use the Pipeline's `eval.md` for cross-step and final-output properties that no single Mold owns. These include validation and round-trip of the final gxformat2 workflow and preservation of the source's scientific intent without silent contradiction. Its `scenarios.md` names the journey input once.

See `content/meta/architecture.md` for the layout and resolution of Pipeline companions.
