# @galaxy-foundry/gxwf-foundry

## 0.2.0

### Minor Changes

- [#565](https://github.com/galaxyproject/foundry/pull/565) [`6365a99`](https://github.com/galaxyproject/foundry/commit/6365a99ed1e18e0526cb0d0d4b3b4ba4c527cca8) Thanks [@jmchilton](https://github.com/jmchilton)! - Add shared declarative Markdown document schemas and structural validation for build and runtime consumers. Migrate CLI pages, evals, and scenarios to the shared parser, and introduce an experimental Workflow Brief schema and validation commands.

  Workflow Briefs separate workflow intent from the agent environment, keep most details optional, and expose a static blocker check through `foundry check-workflow-brief`.

### Patch Changes

- [#618](https://github.com/galaxyproject/foundry/pull/618) [`c048a0c`](https://github.com/galaxyproject/foundry/commit/c048a0c65fb672d32b6d69bb7bfb810d71b9850b) Thanks [@jmchilton](https://github.com/jmchilton)! - Upgrade the Galaxy schema dependency to 1.13.1 to preserve numeric workflow input bounds during conversion.

- Updated dependencies [[`9814cec`](https://github.com/galaxyproject/foundry/commit/9814ceca9fa98d1c26e74f6c46c0f66bff538dc2)]:
  - @galaxy-foundry/summarize-nextflow@0.4.0

## 0.1.2

### Patch Changes

- Updated dependencies [[`ff73ded`](https://github.com/galaxyproject/foundry/commit/ff73dede87b0bd662a52a4705764529ffa5053c6)]:
  - @galaxy-foundry/summarize-nextflow@0.3.0

## 0.1.1

### Patch Changes

- [#486](https://github.com/galaxyproject/foundry/pull/486) [`0457a1b`](https://github.com/galaxyproject/foundry/commit/0457a1ba2933a64882515523cfcf6496130fc546) Thanks [@jmchilton](https://github.com/jmchilton)! - Ignore commented Nextflow declarations and expose subworkflow aliases so summaries preserve the live workflow topology.

- Updated dependencies [[`0457a1b`](https://github.com/galaxyproject/foundry/commit/0457a1ba2933a64882515523cfcf6496130fc546)]:
  - @galaxy-foundry/summarize-nextflow@0.2.0

## 0.1.0

### Minor Changes

- [#240](https://github.com/galaxyproject/foundry/pull/240) [`87f9a46`](https://github.com/galaxyproject/foundry/commit/87f9a4617510f79e9fae02117694b5aa8c1176d1) Thanks [@jmchilton](https://github.com/jmchilton)! - Add browser-safe `./meta` subpath export (`foundryCliMeta`) so consumers can render per-subcommand documentation from static program metadata without invoking commander or shelling out to `foundry --help`. The bin is refactored: `buildProgram()` is now importable from `@galaxy-foundry/gxwf-foundry`'s internal `program.ts`, and the bin entry point is a thin parse-argv shim.

- [#483](https://github.com/galaxyproject/foundry/pull/483) [`d9e6f1a`](https://github.com/galaxyproject/foundry/commit/d9e6f1af7f90021ff5033a1d9c32541cd2ae2cdc) Thanks [@jmchilton](https://github.com/jmchilton)! - Publish the gxwf-specific Foundry CLI and note schema under names that leave
  room in the `@galaxy-foundry` scope for other Foundry implementations.

- [#239](https://github.com/galaxyproject/foundry/pull/239) [`ceb66c9`](https://github.com/galaxyproject/foundry/commit/ceb66c905324317f0815cf410cca76f800f762fb) Thanks [@jmchilton](https://github.com/jmchilton)! - Restructure publishable packages: introduce the unified `foundry` CLI bundling all `validate-*` subcommands plus a `summarize-nextflow` wrapper. The summarize-nextflow package now owns its own schema and self-validates without a foundry dependency. The four standalone schema packages (`summary-nextflow-schema`, `summary-cwl-schema`, `galaxy-tool-discovery-schema`, `galaxy-tool-summary-schema`, `tests-format-schema`) are folded into either `summarize-nextflow` (producer-co-located) or `foundry` (orphans).

### Patch Changes

- [#482](https://github.com/galaxyproject/foundry/pull/482) [`c694e2a`](https://github.com/galaxyproject/foundry/commit/c694e2a1472a8b591b24fbecd2ca812384c2c8f1) Thanks [@jmchilton](https://github.com/jmchilton)! - Publish the vendored Planemo CLI command inventory and test-report schema with
  their typed APIs, raw JSON exports, validators, and upstream provenance.
- Updated dependencies [[`c694e2a`](https://github.com/galaxyproject/foundry/commit/c694e2a1472a8b591b24fbecd2ca812384c2c8f1), [`ceb66c9`](https://github.com/galaxyproject/foundry/commit/ceb66c905324317f0815cf410cca76f800f762fb)]:
  - @galaxy-foundry/summarize-nextflow@0.1.0
