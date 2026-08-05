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
revised: 2026-08-04
revision: 2
summary: "AJV gate for galaxy-tool-cache summarize manifests, including the nested parsed_tool subtree."
related_notes:
  - "[[galaxy-tool-summary]]"
  - "[[parsed-tool]]"
---

# `foundry validate-galaxy-tool-summary`

Validate a Galaxy tool-cache summarize manifest against the [[galaxy-tool-summary]] schema. The nested `parsed_tool` subtree is validated against [[parsed-tool]] in the same pass.

## Output

Prints `<path>: valid` to stdout on success (exit `0`). Schema failure: stderr diagnostics, exit `3`. Input errors exit `1`.

## Examples

```bash
foundry validate-galaxy-tool-summary manifest.json
```

## Gotchas

- **Half the contract is upstream.** The canonical schema ships `$defs.ParsedTool` as a placeholder; the command replaces it with `parsedToolSchema` from `@galaxy-tool-util/schema` before AJV compiles. Diagnostics under `/parsed_tool/…` come from a contract this repo does not own, and an upstream release can change what this command accepts with no commit here.
- Only the merged schema is validated, so there is no flag to check the manifest envelope without the `parsed_tool` subtree. A manifest that is fine at the top level still fails as a whole if its embedded tool drifts from upstream.
