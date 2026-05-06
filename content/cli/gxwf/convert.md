---
type: cli-command
tool: gxwf
command: convert
package: "@galaxy-tool-util/cli"
upstream: "https://github.com/jmchilton/galaxy-tool-util-ts/tree/main/packages/cli/spec/gxwf.json"
tags:
  - cli-command
  - cli/gxwf
status: draft
created: 2026-05-05
revised: 2026-05-06
revision: 2
ai_generated: true
summary: "Convert a Galaxy workflow between native (.ga) and format2 (.gxwf.yml) representations."
---

# `gxwf convert`

Convert a Galaxy workflow between the native `.ga` JSON and the `.gxwf.yml` format2 representation. Use this to normalize fetched IWC workflows into a consistent comparison representation.

## Output

Default output is the converted workflow on stdout. With `--output`, the result is written to a file. JSON output is selected with `--json` (or `--to native`); YAML output is selected with `--yaml` (or `--to format2`).

## Examples

```bash
gxwf convert workflow.ga --to format2 --output workflow.gxwf.yml
gxwf convert workflow.ga --to format2 --compact
gxwf convert workflow.gxwf.yml --to native --output workflow.ga
```

## Gotchas

- Default output is stdout; pipe or pass `--output` when persisting.
- `--compact` drops node position metadata; useful for structural diffs and skeleton generation.
- `--stateful` requires a populated tool cache (see `galaxy-tool-cache`); without it, tool-state stays as fetched.
