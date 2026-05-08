---
type: research
subtype: component
tags:
  - research/component
  - source/nextflow
component: "Nextflow Testing and Test Fixtures"
status: draft
created: 2026-05-01
revised: 2026-05-08
revision: 3
ai_generated: true
summary: "nf-test patterns mapped to Galaxy planemo asserts and CWL test equivalents for split test-plan Molds."
sources:
  - "https://www.nf-test.com/"
  - "https://www.nf-test.com/docs/assertions/"
  - "https://www.nf-test.com/docs/assertions/snapshots/"
  - "https://www.nf-test.com/docs/configuration/"
  - "https://nf-co.re/docs/contributing/nf-test/assertions"
  - "https://nf-co.re/docs/developing/testing/overview"
  - "https://github.com/nf-core/test-datasets"
  - "https://www.nextflow.io/docs/latest/config.html#config-profiles"
  - "https://nf-co.re/docs/contributing/pipelines#test-data"
related_molds:
  - "[[summarize-nextflow]]"
  - "[[nextflow-test-to-galaxy-test-plan]]"
  - "[[nextflow-test-to-cwl-test-plan]]"
  - "[[implement-galaxy-workflow-test]]"
related_notes:
  - "[[planemo-asserts-idioms]]"
  - "[[tests-format]]"
  - "[[iwc-test-data-conventions]]"
  - "[[component-nf-core-tools]]"
---

# Nextflow Testing and Test Fixtures

Operational grounding for two Molds:

- [[summarize-nextflow]] §7 — extract `nf_tests[]` and `test_fixtures` from a real nf-core or DSL2 pipeline.
- [[nextflow-test-to-galaxy-test-plan]] and [[nextflow-test-to-cwl-test-plan]] — translate nf-test fixtures + assertions into target-specific test plans.

The summarize side is mostly *enumeration*: walk `tests/*.nf.test`, extract structured fields per the Mold §7 spec. The translation side is *mapping*: each nf-test assertion pattern has a (sometimes lossy) Galaxy or CWL equivalent.

Companion structured form: `component-nextflow-testing.yml`. Per-pattern entries with `nf_test_pattern`, `description`, `galaxy_equivalent`, `cwl_equivalent`, `notes`, plus `assertion` (the precise nf-test syntax) and `target_link` (deep-links into [[tests-format]] or planemo idioms when applicable).

## What `summarize-nextflow` §7 already encodes

The Mold body's §7 lists the structural fields per nf-test file: `name`, `path`, `profiles[]`, `params_overrides`, `assert_workflow_success`, `snapshot` (with `captures`, `helpers`, `ignore_files`, `ignore_globs`, `snap_path`), `prose_assertions[]`. The schema is `summary-nextflow.schema.json`'s `NfTest` and `SnapshotFixture`.

This note's contribution: the *interpretation* layer that turns those structured fields into target-shaped tests.

## The nf-core snapshot idiom

Templated nf-core modules and pipelines use a near-uniform snapshot pattern:

```groovy
assert snapshot(
    workflow.trace.succeeded().size(),
    versions_yml,
    getAllFilesFromDir(...).list().sort(),    // stable names
    getAllFilesFromDir(...)*.path.collect{ ... }  // stable paths or md5
).match()
```

Four logical captures: succeeded-task count, version YAML, stable file-name list, stable file-path / md5 list. The pruning happens through `ignoreFile: 'tests/.nftignore'` arguments to `getAllFilesFromDir(...)` plus `ignore: [glob1, glob2]` lists.

The translation table in the YAML maps each capture to a Galaxy or CWL assertion. Some are direct (succeeded count → workflow execution success); some are lossy (stable_paths → has_text per output, no md5 chain).

## Source-of-truth chain

1. **nf-test framework** (askimed/nf-test, MIT) — the assertion DSL and snapshot semantics: [www.nf-test.com/docs/assertions/](https://www.nf-test.com/docs/assertions/).
2. **nf-core conventions** — how nf-core pipelines use nf-test: [nf-co.re/docs/contributing/nf-test/assertions](https://nf-co.re/docs/contributing/nf-test/assertions).
3. **planemo / tests-format** — the Galaxy target side. Vocabulary in [[tests-format]]; idiom guide in [[planemo-asserts-idioms]].
4. **cwltest** — the CWL target side. JSON-schema validated YAML test job + expected outputs; cited inline per pattern in the YAML.

## Test-data fixtures

Separate from assertions: where the input data lives.

- `conf/<profile>.config` (default `conf/test.config`) — declares `params.input` (samplesheet URL) and other URL-shaped params per profile. nf-core templates resolve runtime URLs via `params.pipelines_testdata_base_path + 'foo.csv'`.
- [`nf-core/test-datasets`](https://github.com/nf-core/test-datasets) — branch-per-pipeline; the canonical location for samplesheet content. The cast skill follows samplesheet URLs into the appropriate branch when a single fetch enumerates the referenced files.
- The `Mold §7` rule: emit the resolved samplesheet URL plus referenced data files as `TestDataRef` entries; do *not* download for content validation.

## Cross-references

- [[planemo-asserts-idioms]] — Galaxy-side idiom guide; the YAML's `target_link` fields deep-link into this.
- [[tests-format]] — vendored JSON Schema for `<workflow>-tests.yml`; deep-link target for the Galaxy assertion column.
- [[component-nf-core-tools]] — wider tool ecosystem (nf-core's `test_datasets_utils`, branch listings).

## Open gaps

_Updated when a real pipeline exposes an nf-test pattern not mapped here. Each entry names the motivating pipeline._
