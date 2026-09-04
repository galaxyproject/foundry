# @galaxy-foundry/summarize-nextflow

## 0.1.0

### Minor Changes

- [#239](https://github.com/galaxyproject/foundry/pull/239) [`ceb66c9`](https://github.com/galaxyproject/foundry/commit/ceb66c905324317f0815cf410cca76f800f762fb) Thanks [@jmchilton](https://github.com/jmchilton)! - Restructure publishable packages: introduce the unified `foundry` CLI bundling all `validate-*` subcommands plus a `summarize-nextflow` wrapper. The summarize-nextflow package now owns its own schema and self-validates without a foundry dependency. The four standalone schema packages (`summary-nextflow-schema`, `summary-cwl-schema`, `galaxy-tool-discovery-schema`, `galaxy-tool-summary-schema`, `tests-format-schema`) are folded into either `summarize-nextflow` (producer-co-located) or `foundry` (orphans).

### Patch Changes

- [#482](https://github.com/galaxyproject/foundry/pull/482) [`c694e2a`](https://github.com/galaxyproject/foundry/commit/c694e2a1472a8b591b24fbecd2ca812384c2c8f1) Thanks [@jmchilton](https://github.com/jmchilton)! - Publish the vendored Planemo CLI command inventory and test-report schema with
  their typed APIs, raw JSON exports, validators, and upstream provenance.
