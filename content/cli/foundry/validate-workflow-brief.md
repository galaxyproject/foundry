---
type: cli-command
tool: foundry
command: validate-workflow-brief
package: "@galaxy-foundry/gxwf-foundry"
tags:
  - cli/foundry
status: draft
created: 2026-09-17
revised: 2026-09-17
revision: 1
summary: "RFC/WIP structural validator for Workflow Brief YAML documents."
---

# `foundry validate-workflow-brief`

Validate YAML or JSON against the experimental [[workflow-brief]] schema. This is an agent-written rough draft for GitHub review in [issue #563](https://github.com/galaxyproject/foundry/issues/563).

```sh
foundry validate-workflow-brief workflow-brief.yml
```

Success prints `<path>: valid` to stdout and exits `0`. Schema failures print field diagnostics to stderr and exit `3`. Missing files and malformed YAML exit `1`.

Validation covers required sections, nested fields, enum values, and explicit unknowns. It does not establish expert approval or readiness to implement or execute; referential validation and environment preflight remain follow-up work.
