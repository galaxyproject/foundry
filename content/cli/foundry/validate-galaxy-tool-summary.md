---
type: cli-command
tool: foundry
command: validate-galaxy-tool-summary
package: "@galaxy-foundry/foundry"
upstream: "https://github.com/galaxyproject/foundry/blob/main/packages/foundry/src/program.ts"
tags:
  - cli/foundry
status: draft
created: 2026-05-11
revised: 2026-05-11
revision: 1
ai_generated: true
summary: "AJV gate for galaxy-tool-cache summarize manifests, including the nested parsed_tool subtree."
related_notes:
  - "[[galaxy-tool-summary]]"
  - "[[parsed-tool]]"
---

# `foundry validate-galaxy-tool-summary`

Validate a Galaxy tool-cache summarize manifest against the [[galaxy-tool-summary]] schema. The nested `parsed_tool` subtree is validated against [[parsed-tool]] in the same pass.

## Output

Silent on success (exit `0`). Schema failure: stderr diagnostics, exit `3`. Input errors exit `1`.

## Examples

```bash
foundry validate-galaxy-tool-summary manifest.json
```
