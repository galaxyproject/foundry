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
- assertion: a run that stages a data table writes `test-data/tool_data_table_conf.xml.test`, and that one file declares by name every table a staged value belongs to. Each `<file path>` and each path column in a `.loc` row starts with `${__HERE__}` and resolves to an existing file or directory from the file that contains it. Each staged value appears in its table's `value` column. No emitted artifact asks for `--tool_data_table`. A run that stages no table passes.
