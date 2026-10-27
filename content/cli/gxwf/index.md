---
type: cli-tool
tool: gxwf
origin: npm
package: "@galaxy-tool-util/cli"
package_version: "^1.15.0"
invoke: gxwf
invoke_fallback: "npx --yes --package @galaxy-tool-util/cli@1.15.0 gxwf"
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

`npx --yes --package @galaxy-tool-util/cli@1.15.0 gxwf <subcommand>` runs without a global install. For repeat use, `npm install -g @galaxy-tool-util/cli@1.15.0`.

The `1.15.0` minimum preserves numeric workflow input `min` and `max` during conversion to and from native Galaxy range validators. It also includes the draft commands used by the per-step authoring loop. The install pin matches [[galaxy-tool-cache]] and the repository dependency floor. Pinning the `npx --package` spec avoids using an older installed CLI.

`availability_check` is a **capability probe**: `gxwf --help | grep -q draft-validate` asserts the draft-tier capability the pin exists for. `gxwf --version` reports the real package version since 1.15.0; older CLIs report a hardcoded `1.0.0`.
