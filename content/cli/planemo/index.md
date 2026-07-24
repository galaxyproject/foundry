---
type: cli-tool
tool: planemo
origin: pypi
package: planemo
package_version: "0.75.45"
invoke: planemo
invoke_fallback: "uvx --from planemo==0.75.45 planemo"
availability_check: "planemo --version"
docs_url: "https://planemo.readthedocs.io/"
tags:
  - cli/planemo
status: draft
created: 2026-05-10
revised: 2026-07-20
revision: 5
ai_generated: true
summary: "Galaxy tool/workflow runtime testing CLI; used by run-workflow-test and friends."
---

# planemo

Galaxy's runtime testing and authoring CLI. Foundry Molds invoke `planemo test`, `planemo lint`, and friends for end-to-end workflow validation; the cast skill consumes structured JSON output from `--test_output_json` and validates it against [[planemo-test-report]].

## Pin

`package_version` pins to the released `planemo==0.75.45` from PyPI — base upstream planemo, no fork.

[galaxyproject/planemo#1636](https://github.com/galaxyproject/planemo/pull/1636) merged 2026-05-14 and first shipped in released **0.75.42**, so `planemo cli_metadata` and `planemo output_schema` are available in every release at or above this pin. Every Foundry consumer runs off this base pin: the workflow-test phases ([[run-workflow-test]], [[implement-galaxy-workflow-test]]) which need only `planemo test --test_output_json`, the convergence loop in [[convert-nfcore-module-to-galaxy-tool]], and the vendored-artifact regeneration story (`packages/planemo-cli-meta/`, `packages/planemo-test-report-schema/`). No fork pin is required.

## Install

```sh
uvx --from planemo==0.75.45 planemo --version
```

For a persistent install:

```sh
uv tool install planemo==0.75.45
```

Contributor laptops only need planemo when **regenerating** vendored artifacts (the schema JSON in `packages/planemo-test-report-schema/`, the planemo CLI manual pages under `content/cli/planemo/`). Normal Foundry development — `npm run validate`, `npm run test`, `npm run packages-test` — builds against the vendored JSON and does not invoke planemo.
