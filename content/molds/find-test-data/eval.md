# find-test-data eval

Evaluation plan for the `find-test-data` Mold. This file is the **abstract
oracle**: properties any run must satisfy, independent of fixture. Concrete
fixtures and their expected values live in `scenarios.md`; the oracle here is
applied to whatever a scenario produces.

## Property: no fabricated references

- bucket: fidelity
- check: llm-judged
- assertion: every emitted `test-data-refs.json` entry points at a real URL/path, or the input is reported with `resolved: false` and a reason. No invented accessions, Zenodo ids, or paths appear as resolved.

## Property: shape and datatype match

- bucket: fidelity
- check: llm-judged
- assertion: each resolved entry records the Galaxy collection shape and datatype matching the brief's input; a paired-end input does not resolve to a single unpaired file without flagging the mismatch.

## Property: full input coverage

- bucket: utility
- check: deterministic
- assertion: every workflow input label has exactly one entry; each entry is either resolved (URL/path + shape + datatype) or marked `resolved: false` with a reason. No input is uncovered and none is silently absent, so [[implement-galaxy-workflow-test]] can stage from the refs without re-deriving input shapes.

## Property: staged data table is discoverable and portable

- bucket: utility
- check: deterministic
- assertion: a run that stages a data table writes `test-data/tool_data_table_conf.xml.test` and no other data-table configuration. Each `<file path>`, and each `.loc` field in a column the configuration names `path`, starts with `${__HERE__}` and resolves to an existing file or directory from the file that contains it. No emitted artifact asks for `--tool_data_table`. A run that stages no table passes.

## Property: staged value selects a staged row

- bucket: fidelity
- check: llm-judged
- assertion: each ref backed by a staged table has its `location` in the `value` column of a table the configuration declares under the name the wrapper's select reads, and that row passes any filter on the select.
