# interview-to-freeform-summary eval

Evaluation plan for the `interview-to-freeform-summary` Mold. This file is the
**abstract oracle**: properties any run must satisfy, independent of fixture.
Concrete fixtures and their expected values live in `scenarios.md`; the oracle
here is applied to whatever a scenario produces. Properties are tagged by
bucket:

- **fidelity** — does the emitted summary faithfully preserve what the interview
  supports, without dropping facts or inventing specificity?
- **utility** — can downstream freeform-summary Molds bind to the output the
  same way they bind to a paper summary?

## Property: handoff fidelity preserves interview facts

- bucket: fidelity
- check: llm-judged
- assertion: every high-confidence fact the interview supplies (methods, named
  tools, sample-data location, non-default parameters) is surfaced in the
  emitted `freeform-summary.md`, and each point of user uncertainty appears as an
  open question. No high-confidence interview fact is silently dropped.

## Property: no invented specificity

- bucket: fidelity
- check: llm-judged
- assertion: where the user describes an operation vaguely without naming a
  tool, version, or settings, the summary records the intent plus an open
  question; it does not fabricate a specific tool, version, or parameter value to
  fill the gap.

## Property: shared shape with summarize-paper

- bucket: utility
- check: deterministic
- assertion: the artifact is Markdown carrying the shared freeform-summary
  sections (methods, tools, inputs, outputs, parameters, open questions) under
  the `freeform-summary` artifact id — structurally what [[summarize-paper]]
  emits, with nothing interview-specific that
  [[freeform-summary-to-galaxy-interface]] would have to special-case.
