# find-test-data scenarios

## Case: no fabricated references

- fixture: data-flow brief naming several workflow inputs where at least one has no obvious public test dataset.
- expect: every emitted `test-data-refs.json` entry points at a real URL/path, or the input is reported with `resolved: false` and a reason. No invented accessions, Zenodo ids, or paths appear as resolved.

## Case: shape and datatype match

- fixture: data-flow brief with a mix of File, paired, and list:paired collection inputs.
- expect: each resolved entry records the Galaxy collection shape and datatype matching the brief's input; a paired-end input does not resolve to a single unpaired file without flagging the mismatch.

## Case: full input coverage

- fixture: a `test-data-refs.json` emitted for an IWC-style workflow such as SARS-CoV-2 variant calling or RNAseq-PE.
- expect: every workflow input label has exactly one entry; each entry is either resolved (URL/path + shape + datatype) or marked `resolved: false` with a reason. No input is uncovered and none is silently absent, so [[implement-galaxy-workflow-test]] can stage from the refs without re-deriving input shapes.

## Case: staged data table is discoverable and portable

- fixture: interface brief for nf-core/funcscan with string inputs selecting `amrfinderplus_versioned_database` and `mmseqs2_databases`, whose wrappers take a database only from those tables.
- expect: `test-data/tool_data_table_conf.xml.test` declares both tables, every `.loc` path uses `${__HERE__}`, and the AMRFinderPlus database comes from the tools-iuc wrapper's `test-data/test-db`. Moving the run directory leaves `planemo test` able to resolve both values with no `--tool_data_table` flag.
