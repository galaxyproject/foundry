# interview-to-freeform-summary scenarios

Concrete cases for `interview-to-freeform-summary`, exercised against the
abstract properties in `eval.md`. Each case binds a fixture and states its
expected values; the `eval.md` oracle is applied to whatever the case produces.

## Case: rich interview round-trips

- fixture: an interview transcript that names methods, at least one tool,
  sample-data location, one non-default parameter, and an explicit point of user
  uncertainty.
- expect: the emitted `freeform-summary.md` surfaces each of those, and the
  user's uncertainty appears as an open question. No high-confidence interview
  fact is silently dropped.

## Case: vague operation stays vague

- fixture: an interview where the user describes an operation vaguely ("trim the
  reads somehow") without naming a tool or settings.
- expect: the summary records the intent plus an open question; it does not
  fabricate a specific tool, version, or parameter value to fill the gap.

## Case: artifact matches summarize-paper shape

- fixture: a `freeform-summary.md` produced from an interview.
- expect: the artifact is Markdown carrying the shared freeform-summary sections
  (methods, tools, inputs, outputs, parameters, open questions) under the
  `freeform-summary` artifact id — structurally what [[summarize-paper]] emits,
  with nothing interview-specific that [[freeform-summary-to-galaxy-interface]]
  would have to special-case.
