---
type: cli-tool
tool: gxwf
origin: npm
package: "@galaxy-tool-util/cli"
package_version: "^1.8.1"
invoke: gxwf
invoke_fallback: "npx --package @galaxy-tool-util/cli@1.8.1 gxwf"
availability_check: "gxwf --version"
docs_url: "https://github.com/jmchilton/galaxy-tool-util-ts/tree/main/packages/cli"
tags:
  - cli-tool
  - cli/gxwf
status: draft
created: 2026-05-10
revised: 2026-06-18
revision: 2
ai_generated: true
summary: "Galaxy workflow design-time CLI (validate, convert, lint, roundtrip, tool-cache discovery)."
---

# gxwf

Foundry's primary design-time CLI for Galaxy workflow validation and conversion. Bundled with `@galaxy-tool-util/cli` alongside [[galaxy-tool-cache]]; subcommand pages cover individual operations.

## Install

`npx --package @galaxy-tool-util/cli@1.8.1 gxwf <subcommand>` runs without a global install. For repeat use, `npm install -g @galaxy-tool-util/cli@1.8.1`.
