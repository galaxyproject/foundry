# cwl-summary-to-galaxy-interface scenarios

Concrete cases for `cwl-summary-to-galaxy-interface`, exercised against the
abstract properties in `eval.md`. Each case binds a fixture and states its
expected values; the `eval.md` oracle is applied to whatever the case produces.

## Case: secondaryFiles are flagged, not dropped

- fixture: a summary with at least one input or output declaring required `secondaryFiles`.
- expect: required secondaryFiles surface as an open question, composite-dataset note, or explicit Galaxy datatype decision. They must not silently disappear from the brief.

## Case: outputs are testable

- fixture: a summary with workflow outputs, including at least one driven by `pickValue` or a branching `when:`.
- expect: brief names stable workflow-output labels that a later test-plan Mold could address. `pickValue`-derived outputs are flagged as branching choices, not collapsed to singletons.

## Case: downstream data-flow Mold can consume the brief

- fixture: interface brief plus its source summary.
- expect: `cwl-summary-to-galaxy-data-flow` can identify the chosen workflow inputs, outputs, labels, and unresolved branching questions without re-deriving the entire interface from the source CWL.
