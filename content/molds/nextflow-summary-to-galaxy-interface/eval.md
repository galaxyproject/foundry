# nextflow-summary-to-galaxy-interface eval

Evaluation plan for the `nextflow-summary-to-galaxy-interface` Mold. This file is the **abstract oracle**: properties any interface brief must satisfy, independent of fixture. These cases judge whether the brief is useful to downstream Galaxy authoring, not whether it follows one exact prose template. Concrete fixtures and their expected values live in `scenarios.md`; the oracle here is applied to whatever a scenario produces.

## Property: primary data input is identified and runtime params excluded

- bucket: utility
- check: llm-judged
- assertion: the brief identifies the source pipeline's primary data input(s) and excludes obvious Nextflow runtime/publishing params from the chosen Galaxy workflow inputs.

## Property: branch-affecting controls survive, never silently dropped

- bucket: utility
- check: llm-judged
- assertion: a branch-affecting control flag is surfaced as a control rather than silently dropped from the interface.

## Property: sample-sheet metadata is preserved

- bucket: fidelity
- check: llm-judged
- assertion: for a summary with `sample_sheets[]` populated from an nf-schema row schema, the brief chooses a Galaxy collection or sample-sheet-shaped input and carries column roles, requiredness, and optional mate/file columns forward. It must not collapse the source to an opaque CSV unless it explains why.

## Property: output labels are testable

- bucket: utility
- check: llm-judged
- assertion: the brief names stable workflow-output or checkpoint-output labels that a later test-plan Mold could address. Volatile runtime reports may be excluded, but the reason should be visible.

## Property: excluded params are auditable

- bucket: utility
- check: llm-judged
- assertion: excluded params are grouped or otherwise made reviewable, and any exclusion that may affect scientific output is flagged as an open question or design decision.

## Property: downstream data-flow Mold can consume the brief

- bucket: handoff
- check: llm-judged
- assertion: `nextflow-summary-to-galaxy-data-flow` can identify the chosen workflow inputs, outputs, labels, and unresolved interface questions without re-deriving the entire interface from scratch.
