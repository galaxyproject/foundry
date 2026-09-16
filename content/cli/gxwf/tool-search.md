---
type: cli-command
tool: gxwf
command: tool-search
package: "@galaxy-tool-util/cli"
source_url: "https://github.com/jmchilton/galaxy-tool-util-ts/tree/main/packages/cli/spec/gxwf.json"
tags:
  - cli/gxwf
status: draft
created: 2026-04-30
revised: 2026-09-16
revision: 4
summary: "Free-text Tool Shed search returning candidate tools as JSON; first step in the discover-and-pin sequence."
related_notes:
  - "[[component-tool-shed-search]]"
---

# `gxwf tool-search`

Free-text search over the Galaxy Tool Shed's tool index. Designed to feed `galaxy-tool-cache add` (and the rest of the `tool-versions` / `tool-revisions` chain) so a workflow author can go from a query string to a cached `ParsedTool` in a small number of commands.

Instance-agnostic; targets `https://toolshed.g2.bx.psu.edu` by default.

`<query>` is free text; whitespace separates terms. The Tool Shed wraps the term as `*term*` server-side, so noisy queries can match description and help text.

## Output

Default: human-readable list.

`--json`:

```json
{
  "query": "fastqc",
  "hits": [
    {
      "toolId": "fastqc",
      "name": "FastQC",
      "description": "Read Quality reports",
      "owner": "devteam",
      "repoName": "fastqc",
      "trsToolId": "devteam~fastqc~fastqc",
      "score": 12.3
    }
  ]
}
```

A hit identifies `(owner, repoName, toolId)` plus a `trsToolId` (`owner~repo~toolId`). It does **not** include a changeset revision or specific tool version — those come from [[tool-versions]] and [[tool-revisions]].

## Examples

```bash
gxwf tool-search fastqc
gxwf tool-search "quality control" --json --max-results 10
gxwf tool-search bwa --owner devteam --match-name --json
```

Pipe the top hit into the rest of the pin chain:

```bash
gxwf tool-search fastqc --json --max-results 5 \
  | jq -r '.hits[0].trsToolId' \
  | xargs gxwf tool-versions --latest --json
```

## Gotchas

- **No EDAM**, no stem analyzer, no panel context — the Tool Shed tool index is much poorer than Galaxy's installed-toolbox index. Queries match only `name`, `description`, `help`, and `repo_owner_username`. See [[component-tool-shed-search]] §2b.
- **Case-sensitivity asymmetry**. The tool search does not lowercase the query (unlike repo search). Mixed-case queries can miss; lowercase if uncertain.
- **Stale indexes**. Tool Shed Whoosh indexes are rebuilt by cron / admin action, never automatically on upload. A freshly published tool may not show up for some time. Deprecated repos can still appear until the next rebuild.
- **`*term*` wrapping** disables server-side stemming and structured query syntax. Prefer simple terms; combine `--match-name` and `--owner` to tighten.
- **No exact-id matching**. The shed indexes `id` as `TEXT`, not Whoosh `ID`, so it tokenizes — you cannot pin a hit to an exact GUID via search.
- **Same XML id across repos**. The same logical tool (e.g., `bwa`) can be wrapped and published in multiple independent repos. Hits collapse only by `(repoName, owner)`; expect duplicates that need human triage.
- **Repo-level discovery is a different command**. For "find me a *package* about X" with server-side `owner:` / `category:` keywords and popularity-boosted ranking, use `gxwf repo-search` instead.
- **Default page fetch duplicates hits — an unfixed release, not a paging property.** With no explicit `--max-results`, both the table rendering and `--json` return each hit two or three times over (confirmed live against the released CLI `1.10.1`, published 2026-07-13: `gxwf tool-search "cutadapt" --json` returns 50 rows, 20 distinct `trsToolId` values, most repeated). The cause is page-iteration overlap: this release's `tool-search` command walks Tool Shed result pages itself, with no dedup, and pushes every raw hit it sees before it stops at the `--max-results` cap; a small explicit `--max-results` (5, 10, 20 all confirmed distinct) only *looks* like a fix because the loop halts inside the first page, before the overlapping later pages are ever fetched. This is more than noisy output: a triage rule that counts hits to detect ambiguity (e.g. "multiple plausible hits → weak") will misread a single dominant candidate as a cluster of look-alikes. Upstream has already fixed the root cause — `galaxy-tool-util-ts` PR #170 (merged 2026-09-04 as `0ed90f7a`) routes the CLI through `ToolSearchService.searchTools`, which dedupes on `(repoOwnerUsername, repoName, toolId)` — but no release containing it exists yet, and the Foundry's recorded floor (`^1.8.1`) predates it by months. Until a release with #170 ships and the Foundry's pin is bumped to it, always pass an explicit `--max-results`; this Gotcha can be dropped once that happens.

## Pairs with

- [[tool-versions]] — list TRS-published versions for a hit's `trsToolId`.
- [[tool-revisions]] — resolve a `(trsToolId, version)` to changeset revisions for reproducible pinning.
- `galaxy-tool-cache add` — terminal step of the discover-and-pin chain.
