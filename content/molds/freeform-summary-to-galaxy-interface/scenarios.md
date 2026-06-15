# freeform-summary-to-galaxy-interface scenarios

Concrete cases for `freeform-summary-to-galaxy-interface`, exercised against the
abstract properties in `eval.md`. Each case binds an input shape and states its
expected brief content; the `eval.md` oracle is applied to whatever the case
produces. Free-form sources are narrative- or interview-derived, so these cases
bind described input shapes rather than pinned corpus paths.

## Case: source naming sample, reference, and control choices

- fixture: a freeform summary that names sample inputs, reference inputs, and a
  few control choices.
- expect: brief identifies the primary data input(s) and the controls that affect
  scientific output, and does not promote narrative asides or provenance-only
  mentions into workflow inputs.

## Case: source describing a per-sample table

- fixture: a freeform summary describing a per-sample table or sample-to-file
  mapping.
- expect: brief chooses a Galaxy collection or sample-sheet-shaped input and
  carries column roles, requiredness, and optional mate/file columns forward; it
  does not collapse the source to an opaque table unless it explains why.

## Case: source with result tables/figures and intermediate outputs

- fixture: a freeform summary with final result tables/figures and intermediate
  outputs.
- expect: brief names stable workflow-output or checkpoint-output labels that a
  later test-plan Mold could address; figure-/narrative-layer outputs that are not
  workflow-producible are flagged as such rather than forced into the interface.

## Case: source with low-confidence interface details

- fixture: a freeform summary with low-confidence or unspecified interface details
  (datatypes, optionality, exact inputs).
- expect: under-specified interface decisions are surfaced as open questions or
  confidence-tagged assumptions, not silently resolved into precise facts the
  source does not support.

## Case: brief consumed by the data-flow Mold

- fixture: interface brief plus its source summary.
- expect: `freeform-summary-to-galaxy-data-flow` can identify the chosen workflow
  inputs, outputs, labels, and unresolved interface questions without re-deriving
  the entire interface from the source summary.
