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
