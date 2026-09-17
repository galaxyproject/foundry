---
type: cli-command
tool: foundry
command: validate-markdown
package: "@galaxy-foundry/gxwf-foundry"
tags:
  - cli/foundry
status: draft
created: 2026-09-17
revised: 2026-09-17
revision: 1
summary: "Validate Markdown sections with the schemas shared by Foundry build and runtime consumers."
---

# `foundry validate-markdown`

Validate a document against a named section schema. Available schemas are `cli-command`, `eval`, `scenarios`, and `workflow-brief`. The declaration format and TypeScript API are described in [[markdown-document-contract]].

## Output

Prints `<path>: valid` on stdout and exits `0` when the document satisfies its section schema. Structural failures produce line-based diagnostics on stderr and exit `3`. Unknown schema names and input read failures exit `1`.

## Examples

```sh
foundry validate-markdown eval content/molds/implement-galaxy-tool-step/eval.md
foundry validate-markdown scenarios content/molds/implement-galaxy-tool-step/scenarios.md
foundry validate-markdown workflow-brief workflow-brief.md
```

## Gotchas

- This validates section structure. Fixture resolution, frontmatter, semantic correctness, and expert approval have their own checks.
- Only document headings count. Headings inside code fences, block quotes, lists, and HTML comments are ignored.
- The existing CLI, eval, and scenarios schemas retain their case-sensitive heading rules. Workflow Brief headings are case-insensitive.
- Build checks report these section findings as advisory warnings; this command reports schema violations as failures.
