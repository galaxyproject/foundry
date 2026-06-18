---
type: cli-command
tool: galaxy-tool-cache
command: summarize
package: "@galaxy-tool-util/cli"
upstream: "https://github.com/jmchilton/galaxy-tool-util-ts/tree/main/packages/cli/spec/galaxy-tool-cache.json"
tags:
  - cli-command
  - cli/galaxy-tool-cache
status: draft
created: 2026-06-16
revised: 2026-06-18
revision: 2
ai_generated: true
summary: "Emit a deterministic galaxy-tool-summary manifest (cache provenance + embedded ParsedTool + generated input JSON Schemas) for a cached tool."
---

# `galaxy-tool-cache summarize`

Emit a deterministic summary manifest for a tool already in the cache. This is the command [[summarize-galaxy-tool]] invokes: it does not hand-author the manifest, it runs `summarize` against a cache populated for the pin (see `add`). The cache entry must exist — `summarize` does not re-fetch; cache the pin with `add` first.

`<tool_id>` plus `--tool-version` select the cached entry; they must match the pin used at `add` time and the cache key, or the wrong wrapper is summarized. `<tool_id>` accepts a full Tool Shed path, a TRS id, or a **bare/stock id** for built-in tools (`Show beginning1`, `Cut1`, …) — the same id form used at `add` time. A cache miss reports `Tool not found in cache: <id>. Run 'galaxy-tool-cache add' first.`

## Output

A single JSON document conforming to [[galaxy-tool-summary]]. Top-level fields: `schema_version`, `tool_id`, `tool_version`, `cache_key`, `source`, `artifacts`, `parsed_tool`, `input_schemas`, `warnings`. The `parsed_tool` subtree is the upstream [[parsed-tool]] payload verbatim; `input_schemas.workflow_step` / `input_schemas.workflow_step_linked` carry generated JSON Schemas describing the tool's inputs at workflow-step authoring time. Default sink is stdout; `--output` writes a file.

## Flags

- `--tool-version <ver>` — select the cached wrapper version. Pass the discovery pin's version.
- `--output <file>` — write the manifest to a file instead of stdout (default `galaxy-tool-summary.json` per the consuming Mold).
- `--cache-dir <dir>` — cache directory; pass the same path used at `add` time.

## Examples

```bash
galaxy-tool-cache summarize toolshed.g2.bx.psu.edu/repos/iuc/staramr/staramr_search \
  --tool-version 0.11.0+galaxy3 --cache-dir ~/.cache/gxwf \
  --output galaxy-tool-summary.json

# Stock/built-in tool by bare id (must be added with the same pin first)
galaxy-tool-cache summarize "Show beginning1" --tool-version 1.0.2 --cache-dir ~/.cache/gxwf
```

## Gotchas

- Deterministic by design: same cached pin → byte-identical manifest. Re-run after re-`add`ing if the wrapper revision changed.
- Wrapper facts not yet exposed by the upstream `ParsedTool` (requirements, containers, stdio) surface additively as Galaxy extends `ParsedTool`; absence is a coverage gap, not a wrapper without those declarations — cross-check against raw XML when the manifest's `warnings` flag a lossy surface.
- For just the input JSON Schema (not the full manifest), use the `schema` subcommand instead; `summarize` already embeds it under `input_schemas`.
