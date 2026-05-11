# cwl-summary-to-galaxy-interface eval

Evaluation plan for the `cwl-summary-to-galaxy-interface` Mold. These cases judge whether the interface brief is useful to downstream Galaxy authoring, not whether it follows one exact prose template.

## Case: secondaryFiles are flagged, not dropped

- bucket: fidelity
- check: llm-judged
- fixture: a summary with at least one input or output declaring required `secondaryFiles`.
- expectation: required secondaryFiles surface as an open question, composite-dataset note, or explicit Galaxy datatype decision. They must not silently disappear from the brief.

## Case: outputs are testable

- bucket: utility
- check: llm-judged
- fixture: a summary with workflow outputs, including at least one driven by `pickValue` or a branching `when:`.
- expectation: brief names stable workflow-output labels that a later test-plan Mold could address. `pickValue`-derived outputs are flagged as branching choices, not collapsed to singletons.

## Case: downstream data-flow Mold can consume the brief

- bucket: handoff
- check: llm-judged
- fixture: interface brief plus its source summary.
- expectation: `cwl-summary-to-galaxy-data-flow` can identify the chosen workflow inputs, outputs, labels, and unresolved branching questions without re-deriving the entire interface from the source CWL.
