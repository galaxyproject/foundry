# freeform-summary-to-galaxy-interface eval

Evaluation plan for the `freeform-summary-to-galaxy-interface` Mold. This file is
the **abstract oracle**: properties any interface brief must satisfy, independent
of which source summary it ran on. Concrete input shapes and their expected brief
content live in `scenarios.md`; the oracle here is applied to whatever a scenario
produces. These properties judge whether the brief is useful to downstream Galaxy
authoring, not whether it follows one exact prose template. Free-form sources
carry uncertainty; the brief is judged partly on how honestly it surfaces that.

## Property: primary data surface is identified

- bucket: utility
- check: llm-judged
- assertion: the brief identifies the primary data input(s) and the controls that
  affect scientific output, and does not promote narrative asides or
  provenance-only mentions into workflow inputs.

## Property: sample-sheet / per-sample metadata is preserved

- bucket: fidelity
- check: llm-judged
- assertion: when the source describes a per-sample table or sample-to-file
  mapping, the brief chooses a Galaxy collection or sample-sheet-shaped input and
  carries column roles, requiredness, and optional mate/file columns forward. It
  must not collapse the source to an opaque table unless it explains why.

## Property: output labels are testable

- bucket: utility
- check: llm-judged
- assertion: the brief names stable workflow-output or checkpoint-output labels
  that a later test-plan Mold could address. Figure-/narrative-layer outputs that
  are not workflow-producible are flagged as such rather than forced into the
  interface.

## Property: uncertainty is carried, not invented

- bucket: fidelity
- check: llm-judged
- assertion: under-specified interface decisions are surfaced as open questions or
  confidence-tagged assumptions, not silently resolved into precise facts the
  source does not support.

## Property: downstream data-flow Mold can consume the brief

- bucket: handoff
- check: llm-judged
- assertion: `freeform-summary-to-galaxy-data-flow` can identify the chosen
  workflow inputs, outputs, labels, and unresolved interface questions without
  re-deriving the entire interface from the source summary.
