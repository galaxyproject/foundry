---
type: cli-tool
tool: gxwf
origin: npm
package: "@galaxy-tool-util/cli"
package_version: "1.7.2"
invoke: gxwf
invoke_fallback: "npx --yes --package @galaxy-tool-util/cli@1.7.2 gxwf"
availability_check: "gxwf --help | grep -q draft-validate"
docs_url: "https://github.com/jmchilton/galaxy-tool-util-ts/tree/main/packages/cli"
tags:
  - cli-tool
  - cli/gxwf
status: draft
created: 2026-05-10
revised: 2026-06-17
revision: 2
ai_generated: true
summary: "Galaxy workflow design-time CLI (validate, convert, lint, roundtrip, tool-cache discovery)."
---

# gxwf

Foundry's primary design-time CLI for Galaxy workflow validation and conversion. Bundled with `@galaxy-tool-util/cli`; subcommand pages cover individual operations.

## Install

`npx --yes --package @galaxy-tool-util/cli@1.7.2 gxwf <subcommand>` runs without a global install. For repeat use, `npm install -g @galaxy-tool-util/cli@1.7.2`.

The `@1.7.2` pin is load-bearing: it is the first published version shipping the draft-tier subcommands (`draft-validate`, `draft-next-step`, `draft-extract`) the per-step authoring loop depends on, and pinning the `npx --package` spec forces resolution past any stale install. Tracks the `^1.7.2` devDependency in the repo `package.json` / `pnpm-lock.yaml`.

`availability_check` is a **capability probe, not a version check**: `gxwf --version` reports a hardcoded `1.0.0` regardless of the published package version, so a version-number gate would reject the correct CLI. `gxwf --help | grep -q draft-validate` instead asserts the actual draft-tier capability the pin exists for — it passes on a CLI that has the subcommands and fails on a genuinely older one, independent of the bogus version string.
