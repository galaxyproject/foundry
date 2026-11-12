---
type: cli-command
tool: gxwf
command: validate-tool-source
package: "@galaxy-tool-util/cli"
source_url: "https://github.com/jmchilton/galaxy-tool-util-ts/blob/main/packages/cli/spec/gxwf.json"
tags:
  - cli/gxwf
status: draft
created: 2026-11-12
revised: 2026-11-12
revision: 2
summary: "Validate Galaxy user-defined tool YAML against the upstream schema and semantic authoring checks."
---

# `gxwf validate-tool-source`

Validate a `GalaxyUserTool` or `GalaxyTool` YAML file against the schema synced from Galaxy's `DynamicToolSources` models and the semantic checks implemented by `@galaxy-tool-util/schema`.

## Output

The default output is concise human-readable diagnostics. `--json` emits a structured report with `valid` and `errors`; each error has a path, message, keyword and parameters. Exit `0` means valid, exit `1` means validation failed and exit `2` means the YAML could not be parsed.

## Examples

```bash
gxwf validate-tool-source galaxy-user-tool.yml
gxwf validate-tool-source galaxy-user-tool.yml --json
gxwf validate-tool-source galaxy-user-tool.yml --json --security
gxwf validate-tool-source galaxy-user-tool.yml --schema-only
```

## Gotchas

- Do not use `--schema-only` for an authored UDT. It skips semantic checks for blank required fields, input references, output discovery and citations.
- Use `--security` for agent-authored UDTs. It rejects direct top-level `text` interpolation in `shell_command` and executable configfiles with `dynamic_tool.unsafe_text_interpolation`. Serialize free text into a JSON configfile with `JSON.stringify` and read it as data.
- The security check is deliberately narrow: it does not claim to parse arbitrary ECMAScript, shell code, nested parameters or program behavior.
- This command validates the tool language, not whether a target Galaxy permits or can pull the named container. Apply the target's allowed and denied container policy separately.
- A successful static check does not prove the image contains every command or that the tool produces its declared outputs. Confirm image contents and run the workflow test.
