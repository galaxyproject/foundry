---
type: cli-command
tool: galaxy-tool-cache
command: add
package: "@galaxy-tool-util/cli"
upstream: "https://github.com/jmchilton/galaxy-tool-util-ts/tree/main/packages/cli/spec/galaxy-tool-cache.json"
tags:
  - cli/galaxy-tool-cache
status: draft
created: 2026-06-16
revised: 2026-06-18
revision: 2
ai_generated: true
summary: "Fetch a tool from the Tool Shed (shed-path or bare/stock id) and cache its ParsedTool locally for later summarize/schema."
---

# `galaxy-tool-cache add`

Fetch a single tool by id from the Tool Shed and cache its parsed wrapper into the local cache directory. This is the cache-population precondition for [[summarize-galaxy-tool]]: `summarize` reads an already-cached pin and fails if the entry is missing, so `add` runs first.

`<tool_id>` is a full Tool Shed path (e.g. `toolshed.g2.bx.psu.edu/repos/iuc/staramr/staramr_search`), a TRS id, **or a bare/stock id** for a built-in Galaxy tool (`Filter1`, `sort1`, `Cut1`, `Show beginning1`, collection ops). The Tool Shed serves stock tools too, so bare ids resolve against the same shed source — there is no separate Galaxy lookup in the default path. Pin the exact wrapper with `--tool-version` so the cache key matches the discovery pin from [[discover-shed-tool]].

To cache every tool a draft references in one pass instead of pin-by-pin, use `populate-workflow` (scans a `.ga`/`.gxwf.yml`); the loop driver [[advance-galaxy-draft-step]] uses that form.

## Output

No manifest on stdout — the effect is a populated `--cache-dir`. `add` writes the fetched ParsedTool into the cache keyed by tool id + version; `summarize` and `schema` read it from there. Stdout reports the cached tool (`Cached: <name> (<id> v<version>)`); a hard error on an unresolvable id exits non-zero.

## Examples

```bash
# Tool Shed wrapper, pinned by discovery
galaxy-tool-cache add toolshed.g2.bx.psu.edu/repos/iuc/staramr/staramr_search \
  --tool-version 0.11.0+galaxy3 --cache-dir ~/.cache/gxwf

# Stock/built-in tool by bare id (resolves against the shed)
galaxy-tool-cache add "Show beginning1" --tool-version 1.0.2 --cache-dir ~/.cache/gxwf
```

## Gotchas

- `add` is per-pin. Caching the search hit without `--tool-version` may resolve to a different revision than the discovery pin — pass the version explicitly.
- **Stock ids need an explicit `--tool-version`.** Auto-version discovery routes through the shed's TRS version-list endpoint (`…/api/ga4gh/trs/v2/tools/<id>/versions`), which currently 500s, so a bare `add Filter1` fails with "Failed to fetch tool". Pass the concrete version (`add Filter1 --tool-version 1.1.1`); never hand-guess a stock version — confirm it (e.g. from a populated cache via `list`, or a known pin). Requires `@galaxy-tool-util/cli >= 1.8.1`.
- Network-bound: requires Tool Shed (or `--galaxy-url`) reachability. Offline runs must reuse a pre-populated `--cache-dir`.
- Pass the same `--cache-dir` to `add`, `summarize`, and `schema` — they share one cache; `summarize`/`schema` read what `add` wrote.
