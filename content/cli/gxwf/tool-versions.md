---
type: cli-command
tool: gxwf
command: tool-versions
package: "@galaxy-tool-util/cli"
upstream: "https://github.com/jmchilton/galaxy-tool-util-ts/tree/main/packages/cli/spec/gxwf.json"
tags:
  - cli-command
  - cli/gxwf
status: draft
created: 2026-04-30
revised: 2026-05-06
revision: 2
ai_generated: true
summary: "List TRS-published versions of a Tool Shed tool, oldest→newest. Second step in the discover-and-pin sequence."
related_notes:
  - "[[component-tool-shed-search]]"
---

# `gxwf tool-versions`

List the TRS-published versions of a Tool Shed tool, ordered oldest→newest (newest last). Used after [[tool-search]] has surfaced a candidate `trsToolId` and the caller needs to pick a version to cache.

`<tool-id>` accepts both forms:
- TRS form: `owner~repo~tool_id` (e.g. `devteam~fastqc~fastqc`).
- Pretty form: `owner/repo/tool_id` (e.g. `devteam/fastqc/fastqc`).

The `~` form is the Tool Shed's TRS encoding (slashes break FastAPI path-param decoding); the CLI accepts both and normalizes.

## Output

Default: one version string per line, oldest first.

`--json`:

```json
{
  "trsToolId": "devteam~fastqc~fastqc",
  "versions": ["0.72+galaxy1", "0.73+galaxy0", "0.74+galaxy0"]
}
```

`--latest --json`:

```json
{
  "trsToolId": "devteam~fastqc~fastqc",
  "versions": ["0.74+galaxy0"]
}
```

## Examples

```bash
gxwf tool-versions devteam/fastqc/fastqc
gxwf tool-versions devteam~fastqc~fastqc --latest
gxwf tool-versions devteam/fastqc/fastqc --json
```

## Gotchas

- **TRS dedupes by version string.** If multiple changesets publish the same `version` (which is legal — the XML version field is not monotonic and not enforced unique), only the last-seen one appears. The other changesets are invisible at this layer. To see the full set of changesets that publish a given version, use [[tool-revisions]]. See [[component-tool-shed-search]] §3 and §5.
- **`--latest` returns the lexicographically/iteration-order last item, not a semver-parsed maximum.** In practice the TRS list is ordered consistent with the Tool Shed's installable-revisions ordering, so "newest" is normally what you want — but do not assume strict semver semantics.
- **Versions ≠ changesets.** A single TRS version can correspond to multiple changesets in the underlying Mercurial repo. Pinning a workflow for reproducible reinstall requires a `(name, owner, changeset_revision)` triple, not just a version — that is what [[tool-revisions]] produces.
- **Stub list endpoint.** The Tool Shed's TRS `/tools` enumerator is unimplemented (returns `[]`). You cannot bulk-list tools via TRS; you must already have a `trsToolId` from search or a known input.

## Pairs with

- [[tool-search]] — produces the `trsToolId` consumed here.
- [[tool-revisions]] — drills from a `(trsToolId, version)` down to changeset revisions.
- `galaxy-tool-cache add toolshed.g2.bx.psu.edu/repos/<owner>/<repo>/<tool_id> --tool-version <v>` — caches the picked version's `ParsedTool`.
