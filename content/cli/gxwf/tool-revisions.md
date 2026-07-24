---
type: cli-command
tool: gxwf
command: tool-revisions
package: "@galaxy-tool-util/cli"
upstream: "https://github.com/jmchilton/galaxy-tool-util-ts/tree/main/packages/cli/spec/gxwf.json"
tags:
  - cli/gxwf
status: draft
created: 2026-04-30
revised: 2026-05-06
revision: 2
ai_generated: true
summary: "Resolve a Tool Shed tool to changeset revisions for reproducible workflow pinning. Final step in discover-and-pin."
related_notes:
  - "[[component-tool-shed-search]]"
---

# `gxwf tool-revisions`

Resolve a Tool Shed tool to the changeset revisions that publish it, ordered oldest→newest by `get_ordered_installable_revisions`. Needed when emitting a workflow that pins `(name, owner, changeset_revision)` for reproducible reinstall — TRS version strings alone are insufficient because the Tool Shed dedupes versions across changesets.

`<tool-id>` accepts both TRS form (`owner~repo~tool_id`) and pretty form (`owner/repo/tool_id`).

## Output

Default: lines of `<changesetRevision>\t<toolVersion>`.

`--json`:

```json
{
  "trsToolId": "devteam~fastqc~fastqc",
  "version": "0.74+galaxy0",
  "revisions": [
    { "changesetRevision": "5ec9f6bceaee", "toolVersion": "0.74+galaxy0" }
  ]
}
```

`--json` without `--tool-version` returns every installable revision for the tool, each tagged with whatever XML `version` it publishes.

## Examples

```bash
gxwf tool-revisions devteam/fastqc/fastqc --json
gxwf tool-revisions devteam/fastqc/fastqc --tool-version 0.74+galaxy0 --latest
gxwf tool-revisions devteam~fastqc~fastqc --json | jq '.revisions[-1]'
```

Pin the latest changeset for a known version:

```bash
REV=$(gxwf tool-revisions devteam/fastqc/fastqc \
        --tool-version 0.74+galaxy0 --latest --json \
        | jq -r '.revisions[0].changesetRevision')
echo "$REV"
```

## Gotchas

- **Tool versions are not monotonic.** Two changesets can legally publish the same XML `version` with different content. When pinning for reproducibility, prefer the **newest matching revision** (`--latest`) or be explicit about which changeset you want — the version string alone is ambiguous. See [[component-tool-shed-search]] §5.
- **Source of truth for installability.** Only changesets with a `RepositoryMetadata` row marked `downloadable=True` are returned. A repository may have many additional changesets in its Mercurial history that are not installable; those are correctly excluded here.
- **Pin shape is `(name, owner, changeset_revision)`**, not the TRS id. Workflows ultimately reference repos as a triple via the Tool Shed's `get_repository_revision_install_info`. The `trsToolId` exists for discovery only.
- **No bulk endpoint upstream.** Each tool's revision list is one HTTP call; batching N tools means N round-trips. Acceptable for the discover-and-pin path of a workflow author; do not loop over thousands.

## Pairs with

- [[tool-search]] → [[tool-versions]] → [[tool-revisions]] is the canonical discover-and-pin chain.
- `galaxy-tool-cache add toolshed.g2.bx.psu.edu/repos/<owner>/<repo>/<tool_id> --tool-version <v>` — caches the `ParsedTool` once a version is chosen; the changeset revision pin lands in the workflow file (`tool_shed_repository.changeset_revision`), not in the cache.
