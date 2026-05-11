---
type: cli-command
tool: foundry
command: validate-galaxy-tool-discovery
package: "@galaxy-foundry/foundry"
upstream: "https://github.com/jmchilton/foundry/blob/main/packages/foundry/src/program.ts"
tags:
  - cli-command
  - cli/foundry
status: draft
created: 2026-05-11
revised: 2026-05-11
revision: 1
ai_generated: true
summary: "AJV gate for discover-shed-tool recommendation documents."
related_notes:
  - "[[galaxy-tool-discovery]]"
---

# `foundry validate-galaxy-tool-discovery`

Validate a tool-discovery recommendation against the [[galaxy-tool-discovery]] schema. Consumed by harnesses running the discover-or-author branch: a discover-shed-tool Mold emits a recommendation, this gate enforces shape before the harness routes on it.

## Output

Silent on success (exit `0`). Schema failure: stderr diagnostics, exit `3`. Input errors exit `1`.

## Examples

```bash
foundry validate-galaxy-tool-discovery recommendation.json
```
