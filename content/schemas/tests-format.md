---
type: schema
name: tests-format
title: Galaxy workflow test format
package: "@galaxy-foundry/foundry"
package_export: "testsFormatSchema"
validator_bin: foundry
validator_subcommand: validate-tests-format
upstream: "https://github.com/jmchilton/galaxy-tool-util-ts/blob/main/packages/schema/src/test-format/tests.schema.json"
license: MIT
license_file: LICENSES/galaxy-tool-util-ts.LICENSE
tags:
  - schema
  - target/galaxy
status: draft
created: 2026-04-30
revised: 2026-05-05
revision: 4
ai_generated: true
related_notes:
  - "[[galaxy-workflow-test-plan]]"
  - "[[implement-galaxy-workflow-test]]"
  - "[[nextflow-test-to-galaxy-test-plan]]"
  - "[[cwl-test-to-galaxy-test-plan]]"
  - "[[freeform-summary-to-galaxy-test-plan]]"
  - "[[planemo-asserts-idioms]]"
  - "[[iwc-test-data-conventions]]"
  - "[[iwc-shortcuts-anti-patterns]]"
  - "[[validate-tests]]"
  - "[[run-workflow-test]]"
summary: "JSON Schema for the planemo workflow test format (`<workflow>-tests.yml`), vendored from `@galaxy-tool-util/schema`."
---

This page is auto-rendered from the JSON Schema vendored in `@galaxy-tool-util/schema`. The concrete Foundry artifact is `packages/foundry/src/schemas/tests-format/tests.schema.json`, synced from the upstream package by `packages/foundry/scripts/sync-schema.mjs`. Each `$def` becomes a section below with a stable anchor ID — research notes and Mold bodies can deep-link individual assertions via [[tests-format#has_text_model]].

**Source-of-truth chain:**

1. `lib/galaxy/tool_util_models/__init__.py` (`Tests` Pydantic model) in [galaxyproject/galaxy](https://github.com/galaxyproject/galaxy) — see [PR #22566](https://github.com/galaxyproject/galaxy/pull/22566).
2. `scripts/dump-test-format-schema.py` + `make sync-test-format-schema` in [jmchilton/galaxy-tool-util-ts](https://github.com/jmchilton/galaxy-tool-util-ts) write `tests.schema.json` with a `.sha256` integrity file — see [PR #75](https://github.com/jmchilton/galaxy-tool-util-ts/pull/75).
3. Published as `@galaxy-tool-util/schema` on npm; the Foundry pins a version in `package.json`, `packages/foundry/scripts/sync-schema.mjs` mirrors the JSON into `packages/foundry/src/schemas/tests-format/tests.schema.json` at `prebuild`, and the site re-renders. Mold frontmatter cites it via [[tests-format]] wiki-links; cast imports the `testsFormatSchema` runtime export from `@galaxy-foundry/foundry` (declared in this note's `package` / `package_export` frontmatter) and serializes it into cast bundles.

**At runtime in cast skills:** the same vendored schema is copied verbatim into `references/schemas/tests.schema.json` per the casting policy in `docs/COMPILATION_PIPELINE.md`. `@galaxy-tool-util/schema` continues to provide `validateTestsFile` (AJV gate) and `checkTestsAgainstWorkflow` (label/type cross-check against a `.ga` or format2 workflow); `foundry validate-tests-format` wraps both as a CLI subcommand for cast skills and harnesses.
