# interview-to-freeform-summary eval

## Case: handoff fidelity

- check: llm-judged
- fixture: an interview transcript that names methods, at least one tool, sample-data location, one non-default parameter, and an explicit point of user uncertainty.
- expectation: the emitted `freeform-summary.md` surfaces each of those, and the user's uncertainty appears as an open question. No high-confidence interview fact is silently dropped.

## Case: no invented specificity

- check: llm-judged
- fixture: an interview where the user describes an operation vaguely ("trim the reads somehow") without naming a tool or settings.
- expectation: the summary records the intent plus an open question; it does not fabricate a specific tool, version, or parameter value to fill the gap.

## Case: shared shape with summarize-paper

- check: deterministic
- fixture: a `freeform-summary.md` produced from an interview.
- expectation: the artifact is Markdown carrying the shared freeform-summary sections (methods, tools, inputs, outputs, parameters, open questions) under the `freeform-summary` artifact id — structurally what [[summarize-paper]] emits, with nothing interview-specific that [[freeform-summary-to-galaxy-interface]] would have to special-case.
