# freeform-summary-to-galaxy-interface eval

Evaluation plan for the `freeform-summary-to-galaxy-interface` Mold. These cases judge whether the interface brief is useful to downstream Galaxy authoring, not whether it follows one exact prose template. Free-form sources carry uncertainty; the brief is judged partly on how honestly it surfaces that.

## Case: primary data surface is identified

- bucket: utility
- check: llm-judged
- fixture: a freeform summary that names sample inputs, reference inputs, and a few control choices.
- expectation: brief identifies the primary data input(s) and the controls that affect scientific output, and does not promote narrative asides or provenance-only mentions into workflow inputs.

## Case: sample-sheet / per-sample metadata is preserved

- bucket: fidelity
- check: llm-judged
- fixture: a freeform summary describing a per-sample table or sample-to-file mapping.
- expectation: brief chooses a Galaxy collection or sample-sheet-shaped input and carries column roles, requiredness, and optional mate/file columns forward. It must not collapse the source to an opaque table unless it explains why.

## Case: output labels are testable

- bucket: utility
- check: llm-judged
- fixture: a freeform summary with final result tables/figures and intermediate outputs.
- expectation: brief names stable workflow-output or checkpoint-output labels that a later test-plan Mold could address. Figure-/narrative-layer outputs that are not workflow-producible are flagged as such rather than forced into the interface.

## Case: uncertainty is carried, not invented

- bucket: fidelity
- check: llm-judged
- fixture: a freeform summary with low-confidence or unspecified interface details (datatypes, optionality, exact inputs).
- expectation: under-specified interface decisions are surfaced as open questions or confidence-tagged assumptions, not silently resolved into precise facts the source does not support.

## Case: downstream data-flow Mold can consume the brief

- bucket: handoff
- check: llm-judged
- fixture: interface brief plus its source summary.
- expectation: `freeform-summary-to-galaxy-data-flow` can identify the chosen workflow inputs, outputs, labels, and unresolved interface questions without re-deriving the entire interface from the source summary.
