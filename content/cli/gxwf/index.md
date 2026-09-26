---
type: cli-tool
tool: gxwf
origin: npm
package: "@galaxy-tool-util/cli"
package_version: "^1.13.1"
invoke: gxwf
invoke_fallback: "npx --yes --package @galaxy-tool-util/cli@1.13.1 gxwf"
availability_check: "gxwf --help | grep -q draft-validate"
docs_url: "https://github.com/jmchilton/galaxy-tool-util-ts/tree/main/packages/cli"
tags:
  - cli/gxwf
status: draft
created: 2026-05-10
revised: 2026-09-26
revision: 3
summary: "Galaxy workflow design-time CLI (validate, convert, lint, roundtrip, tool-cache discovery)."
---

# gxwf

Foundry's primary design-time CLI for Galaxy workflow validation and conversion. Bundled with `@galaxy-tool-util/cli` alongside [[galaxy-tool-cache]]; subcommand pages cover individual operations.

## Install

`npx --yes --package @galaxy-tool-util/cli@1.13.1 gxwf <subcommand>` runs without a global install. For repeat use, `npm install -g @galaxy-tool-util/cli@1.13.1`.

The `1.13.1` minimum preserves numeric workflow input `min` and `max` during conversion to and from native Galaxy range validators. It also includes the draft commands used by the per-step authoring loop. The install pin matches [[galaxy-tool-cache]] and the repository dependency floor. Pinning the `npx --package` spec avoids using an older installed CLI.

`availability_check` is a **capability probe, not a version check**: `gxwf --version` reports a hardcoded `1.0.0` regardless of the published package version, so a version-number gate would reject the correct CLI. `gxwf --help | grep -q draft-validate` instead asserts the actual draft-tier capability the pin exists for — it passes on a CLI that has the subcommands and fails on a genuinely older one, independent of the bogus version string.
