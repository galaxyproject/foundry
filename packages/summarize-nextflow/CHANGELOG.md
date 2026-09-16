# @galaxy-foundry/summarize-nextflow

## 0.3.0

### Minor Changes

- [#529](https://github.com/galaxyproject/foundry/pull/529) [`ff73ded`](https://github.com/galaxyproject/foundry/commit/ff73dede87b0bd662a52a4705764529ffa5053c6) Thanks [@jmchilton](https://github.com/jmchilton)! - Classify Nextflow profiles by role. `profiles[]` items are now objects
  (`name`, `kinds[]`, `source_path`, `includes[]`, `signals[]`) instead of bare
  name strings — a breaking change to that field, summary schema rev 12.

  `kinds[]` is classified from the profile body with its `includeConfig` chain
  resolved, so consumers no longer re-apply a `startsWith("test")` heuristic that
  mislabels mode-switch profiles named `test` and misses test profiles named
  anything else. It is an array because profiles genuinely combine roles — 25 of
  371 corpus profiles select a container engine and an executor in one block.
  `test`, `container`, `executor`, and `dev` accumulate; `mode` and `resources`
  are fallbacks assigned only when none of those matched, with the suppressed
  evidence kept in `signals[]`.

  The `test` kind is deliberately profile-level evidence, not a final selection:
  pipeline-level `nf_tests[]` remain the higher-fidelity candidate unit because
  they preserve per-test parameter overrides. The kind does not claim that a
  profile is cheap or representative, and `mode` profiles may still encode
  science-scope choices that a target translation must surface.

  Profile enumeration was fixed in the same change: brace-depth tracking (nested
  `params { }` / `process { }` blocks were emitted as profile names), root
  `includeConfig` following, and a bounded scan for launch-time `-c` configs. 11
  of 26 corpus pipelines previously reported a wrong profile list. Structural
  braces inside quoted config values are ignored by the depth tracker.

## 0.2.0

### Minor Changes

- [#486](https://github.com/galaxyproject/foundry/pull/486) [`0457a1b`](https://github.com/galaxyproject/foundry/commit/0457a1ba2933a64882515523cfcf6496130fc546) Thanks [@jmchilton](https://github.com/jmchilton)! - Ignore commented Nextflow declarations and expose subworkflow aliases so summaries preserve the live workflow topology.

## 0.1.0

### Minor Changes

- [#239](https://github.com/galaxyproject/foundry/pull/239) [`ceb66c9`](https://github.com/galaxyproject/foundry/commit/ceb66c905324317f0815cf410cca76f800f762fb) Thanks [@jmchilton](https://github.com/jmchilton)! - Restructure publishable packages: introduce the unified `foundry` CLI bundling all `validate-*` subcommands plus a `summarize-nextflow` wrapper. The summarize-nextflow package now owns its own schema and self-validates without a foundry dependency. The four standalone schema packages (`summary-nextflow-schema`, `summary-cwl-schema`, `galaxy-tool-discovery-schema`, `galaxy-tool-summary-schema`, `tests-format-schema`) are folded into either `summarize-nextflow` (producer-co-located) or `foundry` (orphans).

### Patch Changes

- [#482](https://github.com/galaxyproject/foundry/pull/482) [`c694e2a`](https://github.com/galaxyproject/foundry/commit/c694e2a1472a8b591b24fbecd2ca812384c2c8f1) Thanks [@jmchilton](https://github.com/jmchilton)! - Publish the vendored Planemo CLI command inventory and test-report schema with
  their typed APIs, raw JSON exports, validators, and upstream provenance.
