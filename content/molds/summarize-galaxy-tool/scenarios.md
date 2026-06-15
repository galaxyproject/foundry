# summarize-galaxy-tool scenarios

Concrete cases for `summarize-galaxy-tool`, exercised against the abstract
properties in `eval.md`. Each case binds a fixture and states its expected
values; the `eval.md` oracle is applied to whatever the case produces. The v1
input source is cached ParsedTool JSON per [[galaxy-tool-summary-input-source]].

## Case: FastQC simple wrapper

- fixture: chosen Galaxy tool input source for FastQC after the input-source
  decision is resolved.
- expect: emits a Galaxy tool summary that validates against the
  `summary-galaxy-tool` schema ([[galaxy-tool-summary]]) and includes tool id, version, owner/source
  context, command shape, inputs, outputs, requirements, citations, and tests
  when present.

## Case: bwa_mem2 conditional inputs

- fixture: chosen Galaxy tool input source for a bwa_mem2 wrapper with
  conditional `when` branches.
- expect: reconstructs conditional parameter structure clearly enough for
  downstream step implementation to bind the correct branch-specific inputs
  without flattening away branch ownership.

## Case: samtools_sort data-table reference

- fixture: chosen Galaxy tool input source for a samtools_sort wrapper with
  data-table-backed parameters or reference-genome selection.
- expect: records data-table reference inputs, allowed fallback behavior, and
  unresolved runtime dependencies so downstream implementation can distinguish
  user parameters from Galaxy instance configuration.
