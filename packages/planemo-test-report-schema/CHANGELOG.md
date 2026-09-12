# @galaxy-foundry/planemo-test-report-schema

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
