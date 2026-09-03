---
type: cli-tool
tool: gxwf
origin: npm
package: "@galaxy-tool-util/cli"
invoke: gxwf
invoke_fallback: npx --yes @galaxy-tool-util/cli gxwf
availability_check: gxwf --version
tags:
  - target/galaxy
status: reviewed
created: 2026-07-26
revised: 2026-07-26
revision: 1
summary: Validate, lint, and convert Galaxy workflow files from the command line.
---

# gxwf

The package name and the binary name differ, which is exactly why `invoke` is its own required
field rather than something a cast is expected to infer from `package`.
