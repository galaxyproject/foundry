---
type: cli-command
tool: gxwf
command: validate
package: "@galaxy-tool-util/cli"
tags:
  - target/galaxy
status: reviewed
created: 2026-07-26
revised: 2026-07-26
revision: 1
summary: Check a Galaxy workflow file against the gxformat2 schema and report the first failure.
---

# `gxwf validate`

## Usage

```
gxwf validate <workflow.ga|workflow.gxwf.yml>
```

## Gotchas

- Exits non-zero on the first schema failure; it is not an exhaustive report, so re-run after
  each fix rather than trying to collect every problem in one pass.
