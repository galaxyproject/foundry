# @galaxy-foundry/planemo-test-report-schema

## 0.2.1

### Patch Changes

- [#521](https://github.com/galaxyproject/foundry/pull/521) [`8dd8cc2`](https://github.com/galaxyproject/foundry/commit/8dd8cc24f67b0be05f5e8cb0a3b2b580e989280b) Thanks [@jmchilton](https://github.com/jmchilton)! - Re-vendor against planemo 0.75.47. `cli-meta.json` picks up the new `list_workflows`
  command; `test-report.schema.json` is byte-identical to the 0.75.45 vendoring, so only
  its provenance stamp moves.

  The pin moves for a packaging reason rather than a feature one: `galaxy-tool-util`
  declares `galaxy-tool-util-models` unconstrained, so a fresh resolve of an older planemo
  pairs a 25.1.x tool-util with a 26.x models and fails at import. planemo constrains that
  transitive dependency itself from 0.75.46 on.

## 0.2.0

### Minor Changes

- [#506](https://github.com/galaxyproject/foundry/pull/506) [`4fc7bcd`](https://github.com/galaxyproject/foundry/commit/4fc7bcd7997de443d6c57f3bb848625d4f7cb677) Thanks [@jmchilton](https://github.com/jmchilton)! - Drop `source.release` from both provenance records. It duplicated a hand-maintained pin that
  could silently disagree with `planemo_version`, the version the sync actually observed from the
  binary it invoked. `planemo_version` is now the single version field; the intended pin lives in
  `content/cli/planemo/index.md` and `make check-planemo-pin` compares the two.

  Breaking for anything reading `provenance.source.release` — read `provenance.planemo_version`.

## 0.1.0

### Minor Changes

- [#482](https://github.com/galaxyproject/foundry/pull/482) [`c694e2a`](https://github.com/galaxyproject/foundry/commit/c694e2a1472a8b591b24fbecd2ca812384c2c8f1) Thanks [@jmchilton](https://github.com/jmchilton)! - Publish the vendored Planemo CLI command inventory and test-report schema with
  their typed APIs, raw JSON exports, validators, and upstream provenance.
