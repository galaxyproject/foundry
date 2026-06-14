# summarize-galaxy-tool eval

Evaluation plan for the `summarize-galaxy-tool` Mold. This file is the
**abstract oracle**: properties any run must satisfy, independent of fixture.
Concrete fixtures and their expected values live in `scenarios.md`; the oracle
here is applied to whatever a scenario produces.

## Property: simple wrapper emits a schema-valid, contract-complete summary

- bucket: schema
- check: deterministic
- assertion: a successful run emits a Galaxy tool summary that validates against
  the `summary-galaxy-tool` schema ([[galaxy-tool-summary]]) and includes tool
  id, version, owner/source context, command shape, inputs, outputs,
  requirements, citations, and tests when present.

## Property: conditional parameter structure survives without flattened branches

- bucket: fidelity
- check: llm-judged
- assertion: for a wrapper with conditional `when` branches, the summary
  reconstructs conditional parameter structure clearly enough for downstream
  step implementation to bind the correct branch-specific inputs without
  flattening away branch ownership.

## Property: data-table references stay distinct from user parameters

- bucket: fidelity
- check: llm-judged
- assertion: for a wrapper with data-table-backed parameters or reference-genome
  selection, the summary records data-table reference inputs, allowed fallback
  behavior, and unresolved runtime dependencies so downstream implementation can
  distinguish user parameters from Galaxy instance configuration.
