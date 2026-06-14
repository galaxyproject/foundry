# find-test-data scenarios

Concrete cases for `find-test-data`, exercised against the abstract properties
in `eval.md`. Each case binds a fixture and states its expected values; the
`eval.md` oracle is applied to whatever the case produces.

## Case: no fabricated references

- fixture: data-flow brief naming several workflow inputs where at least one has no obvious public test dataset.
- expect: every emitted `test-data-refs.json` entry points at a real URL/path, or the input is reported with `resolved: false` and a reason. No invented accessions, Zenodo ids, or paths appear as resolved.

## Case: shape and datatype match

- fixture: data-flow brief with a mix of File, paired, and list:paired collection inputs.
- expect: each resolved entry records the Galaxy collection shape and datatype matching the brief's input; a paired-end input does not resolve to a single unpaired file without flagging the mismatch.

## Case: full input coverage

- fixture: a `test-data-refs.json` emitted for an IWC-style workflow such as SARS-CoV-2 variant calling or RNAseq-PE.
- expect: every workflow input label has exactly one entry; each entry is either resolved (URL/path + shape + datatype) or marked `resolved: false` with a reason. No input is uncovered and none is silently absent, so [[implement-galaxy-workflow-test]] can stage from the refs without re-deriving input shapes.
