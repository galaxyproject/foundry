---
type: cli-command
tool: galaxy-tool-cache
command: list
package: "@galaxy-tool-util/cli"
upstream: "https://github.com/jmchilton/galaxy-tool-util-ts/tree/main/packages/cli/spec/galaxy-tool-cache.json"
tags:
  - cli/galaxy-tool-cache
status: draft
created: 2026-06-18
revised: 2026-06-18
revision: 1
ai_generated: true
summary: "Enumerate the tools in a cache directory with their resolved versions; the surface for confirming which stock/shed pin got cached."
---

# `galaxy-tool-cache list`

Enumerate the entries in a `--cache-dir` with their resolved versions, ids, and provenance. Read-only — `list` never fetches; it reports what `add` / `populate-workflow` already cached.

This is the version-confirmation surface for the cache: after `add` resolves a pin, `list` shows the concrete `tool_version` it stored — including for **stock/built-in** ids, whose version is otherwise hard to confirm while the shed's TRS version-list endpoint is down (see [[add]]). Discovery of a not-yet-cached stock version still depends on a populated cache or a known pin; `list` reports an empty array for an empty cache, it does not synthesize the shed's catalogue.

## Output

Human-readable rows by default; `--json` emits an array of cache entries. Per-entry JSON fields: `cache_key`, `tool_id`, `tool_version`, `source` (`api` for shed-fetched, `local` for a pre-seeded tree), `source_url`, `cached_at`. For a stock tool the `tool_id` carries the shed `readableId` form (e.g. `toolshed.g2.bx.psu.edu/repos/Filter1`) while the bare id still selects it in `summarize` / `schema`.

## Examples

```bash
galaxy-tool-cache list --json --cache-dir ~/.cache/gxwf
# [ { "tool_id": "toolshed.g2.bx.psu.edu/repos/Filter1", "tool_version": "1.1.1",
#     "source": "api", "source_url": ".../api/tools/Filter1/versions/1.1.1", ... } ]
```

## Gotchas

- `list` only sees the `--cache-dir` it is pointed at. A version absent from the listing means it was never `add`ed to *that* cache — not that the wrapper does not exist.
- Provenance matters when cross-checking a pin: `source: api` came from the live shed; `source: local` came from a pre-seeded Galaxy tree and is only as current as that tree.
