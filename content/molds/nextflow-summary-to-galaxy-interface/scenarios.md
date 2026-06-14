# nextflow-summary-to-galaxy-interface scenarios

Concrete cases for `nextflow-summary-to-galaxy-interface`, exercised against the abstract properties in `eval.md`. Each case binds a fixture and states its expected values; the `eval.md` oracle is applied to whatever the case produces.

## Case: demo interface identifies the real public surface

- fixture: committed `summarize-nextflow` output for `nf-core__demo`.
- expect: brief identifies `params.input` / `sample_sheets[]` as the primary data input, excludes obvious Nextflow runtime/publishing params, and surfaces `skip_trim` as a branch-affecting control rather than silently dropping it.

## Case: sample-sheet metadata is preserved

- fixture: any summary with `sample_sheets[]` populated from an nf-schema row schema.
- expect: brief chooses a Galaxy collection or sample-sheet-shaped input and carries column roles, requiredness, and optional mate/file columns forward; it does not collapse the source to an opaque CSV unless it explains why.

## Case: output labels are testable

- fixture: a summary with final reports and intermediate QC outputs.
- expect: brief names stable workflow-output or checkpoint-output labels that a later test-plan Mold could address; volatile runtime reports may be excluded, but the reason is visible.

## Case: excluded params are auditable

- fixture: a summary with runtime, notification, publishing, reference, and branch-control params.
- expect: excluded params are grouped or otherwise made reviewable, and any exclusion that may affect scientific output is flagged as an open question or design decision.

## Case: downstream data-flow Mold can consume the brief

- fixture: interface brief plus its source summary.
- expect: `nextflow-summary-to-galaxy-data-flow` identifies the chosen workflow inputs, outputs, labels, and unresolved interface questions without re-deriving the entire interface from scratch.
