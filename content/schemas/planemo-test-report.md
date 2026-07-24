---
type: schema
name: planemo-test-report
title: Planemo test report (JSON)
package: "@galaxy-foundry/planemo-test-report-schema"
package_export: "planemoTestReportSchema"
validator_bin: validate-planemo-test-report
upstream: "https://github.com/galaxyproject/planemo/blob/0.75.45/planemo/test/models.py"
license: MIT
license_file: LICENSES/planemo.LICENSE
tags:
  - target/galaxy
status: draft
created: 2026-05-11
revised: 2026-07-20
revision: 3
ai_generated: true
related_notes:
  - "[[planemo-test]]"
  - "[[planemo-lint]]"
  - "[[convert-nfcore-module-to-galaxy-tool]]"
  - "[[planemo-workflow-test-architecture]]"
summary: "JSON Schema for the report emitted by `planemo test --test_output_json` (and friends), vendored from upstream planemo."
---

This page describes the JSON Schema that `planemo test --test_output_json out.json` writes. The concrete Foundry artifact is `packages/planemo-test-report-schema/src/test-report.schema.json`, synced from upstream planemo's `planemo output_schema --schema test-report` command.

**Source-of-truth chain:**

1. `planemo/test/models.py` (`PlanemoTestReport` Pydantic model) in [galaxyproject/planemo](https://github.com/galaxyproject/planemo) — sourced from released `planemo==0.75.45`, which carries the merged [PR #1636](https://github.com/galaxyproject/planemo/pull/1636).
2. `planemo output_schema --schema test-report` emits a versioned envelope (`schema_version`, `planemo_version`, `schemas`). `@galaxy-foundry/planemo-test-report-schema`'s `scripts/sync-from-planemo.mjs` shells out, unwraps, and writes `src/test-report.schema.json` (AJV-ready) + `src/test-report.provenance.json` (planemo_version + schema_version + source release) — mirrors `tests-format-schema`'s integrity-sidecar pattern.
3. `scripts/sync-schema.mjs` regenerates the TS mirrors from the JSON; contributor laptops never need planemo. The cast pipeline imports `planemoTestReportSchema` and serializes it into cast bundles per the casting policy in `docs/COMPILATION_PIPELINE.md`.

**At runtime in cast skills:** the convergence loop in [[convert-nfcore-module-to-galaxy-tool]] (and any other Mold that runs `planemo test`) consumes `--test_output_json` output, AJV-validates it against this schema, and classifies failures from structured keys instead of free-text parsing. `validate-planemo-test-report` wraps the AJV gate as a CLI for cast skills.

**Pin.** The schema is sourced from released `planemo==0.75.45` (carries the merged [galaxyproject/planemo#1636](https://github.com/galaxyproject/planemo/pull/1636)); the release recorded in `src/test-report.provenance.json` is the regeneration checkpoint. Bump it alongside `package_version` in `content/cli/planemo/index.md` when adopting a newer planemo.
