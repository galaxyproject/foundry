---
type: cli-command
tool: galaxy-tool-cache
command: add
package: "@galaxy-tool-util/cli"
upstream: "https://github.com/jmchilton/galaxy-tool-util-ts/tree/main/packages/cli/spec/galaxy-tool-cache.json"
tags:
  - cli-command
  - cli/galaxy-tool-cache
status: draft
created: 2026-06-16
revised: 2026-06-16
revision: 1
ai_generated: true
summary: "Fetch a tool from the Tool Shed (or a Galaxy instance) and cache its ParsedTool locally for later summarize/schema."
---

# `galaxy-tool-cache add`

Fetch a single tool by id from the Tool Shed (or a Galaxy instance fallback) and cache its parsed wrapper into the local cache directory. This is the cache-population precondition for [[summarize-galaxy-tool]]: `summarize` reads an already-cached pin and fails if the entry is missing, so `add` runs first.

`<tool_id>` is the full Tool Shed path (e.g. `toolshed.g2.bx.psu.edu/repos/iuc/staramr/staramr_search`) or a TRS id. Pin the exact wrapper with `--tool-version` so the cache key matches the discovery pin from [[discover-shed-tool]].

To cache every tool a draft references in one pass instead of pin-by-pin, use `populate-workflow` (scans a `.ga`/`.gxwf.yml`); the loop driver [[advance-galaxy-draft-step]] uses that form.

## Output

No manifest on stdout — the effect is a populated `--cache-dir`. `add` writes the fetched ParsedTool into the cache keyed by tool id + version; `summarize` and `schema` read it from there. Stdout/stderr carry fetch progress and a hard error on an unresolvable id.

## Flags

- `--tool-version <ver>` — pin the wrapper version; cache the exact revision the summary will report.
- `--cache-dir <dir>` — cache directory (shared with `summarize` / `schema`; pass the same path to all three).
- `--galaxy-url <url>` — Galaxy instance URL used as a fallback source when the Tool Shed lookup is insufficient.

## Examples

```bash
galaxy-tool-cache add toolshed.g2.bx.psu.edu/repos/iuc/staramr/staramr_search \
  --tool-version 0.11.0+galaxy3 --cache-dir ~/.cache/gxwf
```

## Gotchas

- `add` is per-pin. Caching the search hit without `--tool-version` may resolve to a different revision than the discovery pin — pass the version explicitly.
- Network-bound: requires Tool Shed (or `--galaxy-url`) reachability. Offline runs must reuse a pre-populated `--cache-dir`.
