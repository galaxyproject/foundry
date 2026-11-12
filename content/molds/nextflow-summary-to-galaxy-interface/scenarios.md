# nextflow-summary-to-galaxy-interface scenarios

## Case: demo interface identifies the real public surface

- fixture: committed `summarize-nextflow` output for `nf-core__demo`.
- expect: brief identifies `params.input` / `sample_sheets[]` as the primary data input, excludes obvious Nextflow runtime/publishing params, and surfaces `skip_trim` as a branch-affecting control rather than silently dropping it. Every branch fits one workflow, so the ledger holds no scope decision.

## Case: sarek scope is decided and recorded

- fixture: `summarize-nextflow` output for `workflow-fixtures/pipelines/nf-core__sarek` (3.8.1, `4bd2948f`), no caller-supplied scope. `test_selection` selects `tests/default.nf.test` (profile `test`, `tools: strelka`).
- expect: the run does not stop to ask for a scope. The ledger holds one scope decision fixing `step: mapping`, `aligner: bwa-mem` and `tools: strelka`, citing `params[step]`, `params[aligner]` and the selected candidate's `params_delta`. It holds open scope drops at least for somatic calling (citing `profiles[mutect]`), tumor-only calling, the other germline callers, the four other aligners (`params[aligner].enum`), the later start steps (`params[step].enum`), and annotation. `step` and `aligner` are not workflow inputs, and the brief names the scope and the drop `id`s. `examples/sarek-germline-scope/open-requirements.ledger.yml` is one passing ledger, checked by `tests/scope-decisions.test.ts`.

## Case: rnaseq scope falls back without stopping

- fixture: `summarize-nextflow` output for `workflow-fixtures/pipelines/nf-core__rnaseq` (3.24.0, `47b3b0d3`), no caller-supplied scope. `test_selection.status` is `needs-scope-choice`.
- expect: the run does not stop to ask for a scope. The scope decision's `candidate` is `tests/default.nf.test::Params: default`, which changes no branch control and wins the tie with its `- stub` twin, and the decision carries `confidence: low`. The brief names that candidate. The scope fixes `aligner: star_salmon`, and a scope drop citing `params[aligner].enum` covers the other three aligners.

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
