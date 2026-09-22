# workflow-brief-to-galaxy-interface scenarios

Each case includes a reviewed Workflow Brief. Source summaries are optional
evidence rather than the authoritative input.

## Case: evidence is broader than reviewed scope

- fixture: a Workflow Brief selecting quality reporting plus a source summary
  that also describes trimming and aggregation.
- expect: the interface includes quality-reporting inputs and outputs, excludes
  trimming and aggregation, cites the summary only for evidence within scope,
  and leaves the brief unchanged.

## Case: source naming sample, reference, and control choices

- fixture: a Workflow Brief naming sample inputs, reference inputs, and a few
  control choices, with optional supporting evidence.
- expect: brief identifies the primary data input(s) and the controls that affect
  scientific output, and does not promote narrative asides or provenance-only
  mentions into workflow inputs.

## Case: source describing a per-sample table

- fixture: a Workflow Brief describing a per-sample table or sample-to-file
  mapping, with optional supporting evidence.
- expect: brief chooses a Galaxy collection or sample-sheet-shaped input and
  carries column roles, requiredness, and optional mate/file columns forward; it
  does not collapse the source to an opaque table unless it explains why.

## Case: source with result tables/figures and intermediate outputs

- fixture: a Workflow Brief with final result tables/figures and intermediate
  outputs.
- expect: brief names stable workflow-output or checkpoint-output labels that a
  later test-plan Mold could address; figure-/narrative-layer outputs that are not
  workflow-producible are flagged as such rather than forced into the interface.

## Case: source with low-confidence interface details

- fixture: a Workflow Brief with low-confidence or unspecified interface details
  (datatypes, optionality, exact inputs).
- expect: under-specified interface decisions are surfaced as open questions or
  confidence-tagged assumptions, not silently resolved into precise facts the
  source does not support.

## Case: brief consumed by the data-flow Mold

- fixture: Workflow Brief, interface brief, and optional source evidence.
- expect: `workflow-brief-to-galaxy-data-flow` can identify the chosen workflow
  inputs, outputs, labels, and unresolved interface questions without re-deriving
  the entire interface from source evidence.
