# Sarek germline scope

`open-requirements.ledger.yml` holds the scope records the interface Mold writes for nf-core/sarek 3.8.1 (`4bd2948f`) when no caller supplies a scope: one scope decision and nine open scope drops. `test_selection` selects `tests/default.nf.test` (profile `test`, `tools: strelka`), so the run builds germline Strelka calling from FASTQ. Each other branch family becomes a drop that cites the summary values that would run it.

`tests/scope-decisions.test.ts` checks the record shape. When `make fixtures-nextflow` has fetched sarek, it also summarizes sarek and checks that every `from` citation backs its value and every backticked unit name is in the summary.
