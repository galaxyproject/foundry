# nextflow-summary-to-galaxy-interface eval

Evaluation plan for the `nextflow-summary-to-galaxy-interface` Mold. These cases judge whether the interface brief is useful to downstream Galaxy authoring, not whether it follows one exact prose template.

## Case: demo interface identifies the real public surface

- bucket: utility
- check: llm-judged
- fixture: committed `summarize-nextflow` output for `nf-core__demo`.
- expectation: brief identifies `params.input` / `sample_sheets[]` as the primary data input, excludes obvious Nextflow runtime/publishing params, and surfaces `skip_trim` as a branch-affecting control rather than silently dropping it.

## Case: sample-sheet metadata is preserved

- bucket: fidelity
- check: llm-judged
- fixture: any summary with `sample_sheets[]` populated from an nf-schema row schema.
- expectation: brief chooses a Galaxy collection or sample-sheet-shaped input and carries column roles, requiredness, and optional mate/file columns forward. It must not collapse the source to an opaque CSV unless it explains why.

## Case: output labels are testable

- bucket: utility
- check: llm-judged
- fixture: a summary with final reports and intermediate QC outputs.
- expectation: brief names stable workflow-output or checkpoint-output labels that a later test-plan Mold could address. Volatile runtime reports may be excluded, but the reason should be visible.

## Case: excluded params are auditable

- bucket: utility
- check: llm-judged
- fixture: a summary with runtime, notification, publishing, reference, and branch-control params.
- expectation: excluded params are grouped or otherwise made reviewable, and any exclusion that may affect scientific output is flagged as an open question or design decision.

## Case: downstream data-flow Mold can consume the brief

- bucket: handoff
- check: llm-judged
- fixture: interface brief plus its source summary.
- expectation: `nextflow-summary-to-galaxy-data-flow` can identify the chosen workflow inputs, outputs, labels, and unresolved interface questions without re-deriving the entire interface from scratch.
