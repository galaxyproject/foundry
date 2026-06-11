---
type: cli-tool
tool: planemo
origin: pypi
package: planemo
package_version: "git+https://github.com/jmchilton/planemo@a9b8b8bc7ab3b12035d53bdb5383fe450413d9f3"
invoke: planemo
invoke_fallback: "uvx --from git+https://github.com/jmchilton/planemo@a9b8b8bc7ab3b12035d53bdb5383fe450413d9f3 planemo"
availability_check: "planemo --version"
docs_url: "https://planemo.readthedocs.io/"
tags:
  - cli-tool
  - cli/planemo
status: draft
created: 2026-05-10
revised: 2026-05-11
revision: 2
ai_generated: true
summary: "Galaxy tool/workflow runtime testing CLI; used by run-workflow-test and friends."
---

# planemo

Galaxy's runtime testing and authoring CLI. Foundry Molds invoke `planemo test`, `planemo lint`, and friends for end-to-end workflow validation; the cast skill consumes structured JSON output from `--test_output_json` and validates it against [[planemo-test-report]].

## Pin

`package_version` pins to `jmchilton/planemo@a9b8b8bc7ab3b12035d53bdb5383fe450413d9f3` — the merge commit that introduces `planemo cli_metadata` and `planemo output_schema` ([galaxyproject/planemo#1636](https://github.com/galaxyproject/planemo/pull/1636), OPEN as of 2026-05-11). The SHA lives on `jmchilton/planemo`, not `galaxyproject/planemo`, because #1636 has not merged upstream yet. Flip the pin to a released `planemo>=<version>` once the PR merges and publishes.

The convergence loop in [[convert-nfcore-module-to-galaxy-tool]] depends on the JSON test report produced by this SHA; older planemo releases emit only free-text output that the cast skill cannot classify mechanically.

## Install

```sh
uvx --from git+https://github.com/jmchilton/planemo@a9b8b8bc7ab3b12035d53bdb5383fe450413d9f3 planemo --version
```

For a persistent install:

```sh
uv tool install git+https://github.com/jmchilton/planemo@a9b8b8bc7ab3b12035d53bdb5383fe450413d9f3
```

Contributor laptops only need planemo when **regenerating** vendored artifacts (the schema JSON in `packages/planemo-test-report-schema/`, the planemo CLI manual pages under `content/cli/planemo/`). Normal Foundry development — `npm run validate`, `npm run test`, `npm run packages-test` — builds against the vendored JSON and does not invoke planemo.
