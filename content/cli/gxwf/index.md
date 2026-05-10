---
type: cli-tool
tool: gxwf
origin: npm
package: "@galaxy-tool-util/cli"
invoke: gxwf
invoke_fallback: "npx --package @galaxy-tool-util/cli gxwf"
availability_check: "gxwf --version"
docs_url: "https://github.com/jmchilton/galaxy-tool-util-ts/tree/main/packages/cli"
tags:
  - cli-tool
  - cli/gxwf
status: draft
created: 2026-05-10
revised: 2026-05-10
revision: 1
ai_generated: true
summary: "Galaxy workflow design-time CLI (validate, convert, lint, roundtrip, tool-cache discovery)."
---

# gxwf

Foundry's primary design-time CLI for Galaxy workflow validation and conversion. Bundled with `@galaxy-tool-util/cli`; subcommand pages cover individual operations.

## Install

`npx --package @galaxy-tool-util/cli gxwf <subcommand>` runs without a global install. For repeat use, `npm install -g @galaxy-tool-util/cli`.
