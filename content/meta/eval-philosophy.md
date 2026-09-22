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

An evaluation plan tells Foundry maintainers how to judge a Mold's output, regardless of the input used to produce it. Put those reusable checks in `eval.md`. Put a particular input and its expected result in `scenarios.md`. This separation also applies to Pipelines, where one scenario can exercise a whole journey.

This page explains why the files have different jobs and how to decide where a check belongs. For file layout, case shape, and validator rules, see [[mold-spec]].

## Separate the oracle from the cases

`eval.md` is an abstract oracle: it states properties that should hold across inputs. `scenarios.md` binds an input or fixture to expected values. A test run pairs a scenario's output with the eval properties, then checks the scenario's own expectations.

For a sorting function, the oracle might require the output to contain the same elements in nondecreasing order. The case `sort([3,1,2]) == [1,2,3]` belongs in the scenario file. The first statement can judge any input. The second describes one input and its expected output.

The split has practical consequences:

1. **One oracle can judge many inputs.** “Every `processes[].tool` is a foreign key into `tools[]`” applies to a summary of any pipeline. A fixture-specific count would obscure that general rule.
2. **One input can meet many oracles.** A Pipeline scenario such as `nf-core/sarek` with five steps passes through the journey's Molds. Each Mold's `eval.md` judges its own output from that run, while the scenario names the input once.
3. **Fixtures can change without changing the rule.** Paths move, corpora change, and pinned diffs become stale. Their expected values stay in `scenarios.md`, so the reusable property remains in `eval.md`.
4. **Concrete regressions have a clear home.** “CalliNGS-NF has 11 processes” and “sarek yields 17 sample-sheet columns” are scenario expectations, even when they expose important failures. A named fixture or a fixed expected value is a signal to use `scenarios.md`.

The same distinction applies to regression checks. “Output is deterministic across re-runs” is an eval property. “bacass `summary.json` is byte-identical to the committed pin” is a scenario expectation.

## Write properties that detect failures without prescribing a solution

An eval property should identify an observable failure while allowing valid outputs to differ. For example, “`secondaryFiles` surface as an open question or a composite-dataset note” catches silent loss. Requiring `secondaryFiles` to use Galaxy composite datatypes would prescribe one design and reject another output that handles the issue correctly.

This matters for handoffs between Molds. A downstream Mold may simplify, rename, or restructure an upstream brief. The useful property is that it “must not silently contradict a high-confidence upstream decision,” rather than that every input detail appears unchanged.

Omissions and fabrications are especially useful failure targets. An eval can require an invented Tool Shed ID to be flagged, or require a `pickValue` marker, an `ExpressionTool` step, a step ID, or a branch-control parameter such as `skip_trim` to appear or be explicitly accounted for. The common rule is that material information must not silently vanish or be fabricated. State the rule so it can apply to any relevant input.

## Give every eval property a pass/fail edge

Before adding a property, imagine an output that would violate it. If no such output is clear, place the material elsewhere:

- A description of what a run tends to look like belongs in the Mold body or `examples/`.
- An unanswered design question, such as whether a field is useful, belongs in `refinement.md`.
- A fixture with an expected value belongs in `scenarios.md`.
- An instruction that merely repeats what the Mold's `index.md` already says to produce adds no evaluation value. Remove it.

These files answer different maintainer questions: what the Mold does, what can go wrong, which concrete inputs expose that behavior, and which design choices remain open. [[mold-spec]] defines their contracts.

## Execute deterministic checks to earn a verdict

Each property in `eval.md` declares `check: deterministic` or `check: llm-judged`. A deterministic property names a mechanical oracle, such as a schema validator, structural diff, `gxwf validate` or `roundtrip`, or a `planemo test` run. Its verdict requires running that check. Predicting the result from inspection is not a pass. If the check genuinely cannot run, report the trial as blocked.

Use `llm-judged` for properties assessed through reasoned inspection. This distinction keeps mechanical verdicts tied to executed checks while leaving qualitative judgments to review.

For example, `run-workflow-test` can use Planemo-managed Galaxy. `planemo test` starts its own Galaxy, so the absence of an already running Galaxy does not justify skipping that deterministic check. See `/test-drive` step 4 and [[run-workflow-test]] for the test path.

## Evaluate Pipelines through their Molds and a pipeline oracle

A Pipeline combines its member Molds' evaluations with its own `eval.md`:

- **Mold properties** judge each step's output as the journey advances. A `[loop]` phase is judged at its endstate, not on every iteration. A `[branch]` phase has no oracle of its own, so the chosen Mold's eval applies.
- **Pipeline properties** cover end-to-end and cross-step behavior that no single Mold owns. For example, the final gxformat2 workflow validates and round-trips, and the source's scientific intent survives the source-to-target journey without silent contradiction. The Pipeline's `scenarios.md` names the journey input once.

See [[architecture]] for the Pipeline companion layout and resolution rules.
