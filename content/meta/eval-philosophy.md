---
type: meta
title: "Eval Philosophy"
record_kind: foundation
order: 7
tags:
  - meta
status: reviewed
created: 2026-06-14
revised: 2026-09-22
revision: 4
summary: "Why eval.md is an abstract oracle and scenarios.md holds the concrete cases, and the eval/scenario/refinement split."
---

`eval.md` defines properties for judging a Mold or Pipeline output. `scenarios.md` supplies particular inputs and expected results. Keeping them separate lets one property judge many cases and one scenario pass through several Molds. [[mold-spec]] defines the file contract.

## Separate properties from cases

For a sorting function, an `eval.md` property could require the output to contain the same elements as the input in nondecreasing order. The case `sort([3,1,2]) == [1,2,3]` belongs in `scenarios.md`. The first statement can judge every input. The second binds one input to one expected result.

The same distinction applies to Foundry outputs:

| Put in | When the statement describes | Example |
| --- | --- | --- |
| `eval.md` | A property that can pass or fail for any applicable input | Every `processes[].tool` refers to an entry in `tools[]`. |
| `scenarios.md` | A named fixture and its expected values or assertions | CalliNGS-NF has 11 processes. |

Early Foundry eval files carried fixtures and expected values together. Separating them makes a property reusable across fixtures and keeps fixture changes in one place. Paths can move, corpora can change, and pinned output comparisons can go stale without changing the rule used to judge outputs.

The separation also works in the other direction. A Pipeline scenario such as `nf-core/sarek` across 5 steps names one journey input. Each Mold's `eval.md` judges its own output from that journey. A fixture-specific claim such as “sarek yields 17 sample-sheet columns” belongs with the scenario, not in each Mold's oracle.

For regression checks, “output is deterministic across re-runs” is an `eval.md` property. “bacass `summary.json` is byte-identical to the committed pin” is a `scenarios.md` case. If a statement names a particular fixture or expected value, put it in the scenario.

## Check behavior without prescribing the fix

An eval property names what must remain true, not how to implement it. In CWL, required `secondaryFiles` are companion files to a primary file. A Galaxy design brief can carry them forward or flag an unresolved mapping. A property that requires one Galaxy composite datatype would reject another valid way to handle them.

This matters at handoffs between Molds. A downstream Mold may simplify, rename, or restructure an upstream brief. A useful property says that the output must not silently contradict a high-confidence upstream decision. Requiring every input detail to reappear would reject legitimate drafting changes.

At a Mold boundary, useful checks catch fabrication and omission. Examples include invented Tool Shed IDs or step IDs, lost `pickValue` markers, missing `ExpressionTool` steps, and a branch-control parameter such as `skip_trim` disappearing. Require each applicable item to be grounded in the source or explicitly flagged. A plausible output must not silently invent or lose material facts.

## Give every property a failure case

Before adding a property, imagine an output that would violate it. If no such output is clear, place the material elsewhere:

- A fixture and its expected result belong in `scenarios.md`.
- An unresolved design question, such as “is field X pulling weight?”, belongs in `refinement.md`.
- An illustration of what a run looks like belongs in the Mold body or `examples/`.
- A restatement of an instruction already in `index.md`, such as “produce X,” adds no new check and can be removed.

An eval property earns its place when it catches a failure the Mold procedure alone may miss. [[mold-spec]] defines the companion files.

## Run deterministic checks

Each `eval.md` property declares `check: deterministic` or `check: llm-judged`. Run the named oracle for a deterministic verdict, such as schema validation, a structural diff, `gxwf validate` or round-trip, or `planemo test`. Use reasoned inspection for `llm-judged` properties.

Describing what a validator would report does not establish a deterministic verdict. If a trial cannot run a required check, report it as blocked instead of passing the property by inspection. For `run-workflow-test`, `planemo test` starts its own Galaxy, so the absence of an already-running Galaxy is not a reason to skip it. See `/test-drive` step 4 and [[run-workflow-test]] for the test path.

## Evaluate Pipelines at each step and end to end

A Pipeline combines its Molds' evaluations with a small Pipeline-level oracle:

- **Mold properties** judge each step's output as the journey advances. Judge a `[loop]` phase at its endstate. A `[branch]` phase has no oracle of its own, so apply the chosen Mold's `eval.md`.
- **Pipeline properties** cover cross-step and final-output behavior that no single Mold owns. For a Galaxy-targeting journey, the final gxformat2 workflow must validate and round-trip. The source's scientific intent must survive without silent contradiction. The Pipeline's `scenarios.md` names the journey input once.

See [[architecture]] for the layout and resolution of Pipeline companions.
