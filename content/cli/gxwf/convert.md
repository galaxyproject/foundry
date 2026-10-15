---
type: cli-command
tool: gxwf
command: convert
package: "@galaxy-tool-util/cli"
source_url: "https://github.com/jmchilton/galaxy-tool-util-ts/tree/main/packages/cli/spec/gxwf.json"
tags:
  - cli/gxwf
status: draft
created: 2026-05-05
revised: 2026-09-26
revision: 3
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
- With a populated tool cache, conversion re-encodes tool state using cached definitions by default. Use `--no-stateful` to copy tool state through verbatim, or `--stateful` to force re-encoding even when the cache is empty. See [[galaxy-tool-cache]].
- Version `1.13.1` preserves numeric input `min` and `max` as native Galaxy range validators and recovers them on export.
