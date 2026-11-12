# Sarek germline scope

The scope records the interface Mold writes for nf-core/sarek 3.8.1 (`4bd2948f`), run without a caller-supplied scope. `test_selection` selects `tests/default.nf.test` (profile `test`, `tools: strelka`). The run builds germline Strelka calling from FASTQ and drops every other branch family, each one citing the summary values that would run it.

- `open-requirements.ledger.yml`: one scope decision and nine open scope drops.

`tests/scope-decisions.test.ts` checks the record shape. When the sarek fixture is cloned, it also summarizes sarek and checks that every `from` citation and every backticked unit name exists in the summary.
