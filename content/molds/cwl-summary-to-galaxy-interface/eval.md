# cwl-summary-to-galaxy-interface eval

Evaluation plan for the `cwl-summary-to-galaxy-interface` Mold. This file is the
**abstract oracle**: properties any interface brief must satisfy, independent of
fixture. They judge whether the brief is useful to downstream Galaxy authoring,
not whether it follows one exact prose template. Concrete fixtures and their
expected values live in `scenarios.md`; the oracle here is applied to whatever a
scenario produces.

## Property: secondaryFiles are flagged, not dropped

- bucket: fidelity
- check: llm-judged
- assertion: for any summary with at least one input or output declaring required `secondaryFiles`, those required secondaryFiles surface as an open question, composite-dataset note, or explicit Galaxy datatype decision. They must not silently disappear from the brief.

## Property: outputs are testable

- bucket: utility
- check: llm-judged
- assertion: for any summary with workflow outputs, the brief names stable workflow-output labels that a later test-plan Mold could address. Any `pickValue`-derived or branching-`when:`-driven output is flagged as a branching choice, not collapsed to a singleton.

## Property: downstream data-flow Mold can consume the brief

- bucket: handoff
- check: llm-judged
- assertion: given an interface brief plus its source summary, `cwl-summary-to-galaxy-data-flow` can identify the chosen workflow inputs, outputs, labels, and unresolved branching questions without re-deriving the entire interface from the source CWL.
