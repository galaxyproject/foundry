---
type: schema
name: galaxy-tool-discovery
title: Galaxy tool discovery recommendation
package: "@galaxy-foundry/foundry"
package_export: "galaxyToolDiscoverySchema"
validator_bin: foundry
validator_subcommand: validate-galaxy-tool-discovery
upstream: "https://github.com/jmchilton/foundry/blob/main/packages/foundry/src/schemas/galaxy-tool-discovery/galaxy-tool-discovery.schema.json"
tags:
  - schema
  - target/galaxy
status: draft
created: 2026-05-04
revised: 2026-05-04
revision: 1
ai_generated: true
related_molds:
  - "[[discover-shed-tool]]"
  - "[[summarize-galaxy-tool]]"
  - "[[author-galaxy-tool-wrapper]]"
  - "[[implement-galaxy-tool-step]]"
summary: "JSON Schema for Tool Shed discovery hit, weak, and miss recommendations."
---

This page is auto-rendered from the JSON Schema authored in this repo. Each `$def` becomes a section below with a stable anchor ID — research notes and Mold bodies can deep-link individual shapes via [[galaxy-tool-discovery#ToolCandidate]].

**Source-of-truth chain:**

1. `packages/foundry/src/schemas/galaxy-tool-discovery/galaxy-tool-discovery.schema.json` — the canonical JSON, hand-edited as part of the Mold/cast loop around [[discover-shed-tool]]. Mold frontmatter cites it via [[galaxy-tool-discovery]] wiki-links; cast imports the `galaxyToolDiscoverySchema` runtime export and serializes it into cast bundles.
2. `packages/foundry/scripts/sync-schema.mjs` runs at `prebuild`, regenerating the typed `galaxy-tool-discovery.schema.generated.ts` const wrapper from the canonical JSON.
3. Published as part of `@galaxy-foundry/foundry` (orphan schema bundled in the unified CLI). Site rendering imports the schema directly from this package via `site/src/lib/schema-registry.ts`; the published CLI also ships `foundry validate-galaxy-tool-discovery` for cast skills and downstream consumers.

**At runtime in cast skills:** validation should happen through the CLI command:

```sh
foundry validate-galaxy-tool-discovery recommendation.json
```

Library validation exists for TypeScript consumers, but generated skills should prefer command-shaped validation so failures are easy to reproduce outside the agent runtime.

## Why recommendation-shaped

[[discover-shed-tool]] is not just a thin `gxwf tool-search` wrapper. It searches, resolves candidate versions, resolves changeset revisions, ranks alternates, and decides whether the harness should proceed, ask for confirmation, or fall through to [[author-galaxy-tool-wrapper]]. The schema therefore models the recommendation boundary rather than any one upstream CLI response.

The deterministic primitive outputs stay upstream in `@galaxy-tool-util/*`:

- `gxwf tool-search` emits Tool Shed hits.
- `gxwf tool-versions` resolves TRS versions.
- `gxwf tool-revisions` resolves installable changeset revisions.
- `galaxy-tool-cache add` materializes the selected wrapper for [[summarize-galaxy-tool]].

The Foundry-owned recommendation shape adds the LLM/harness semantics those commands intentionally do not own: `hit`, `weak`, `miss`, alternates, warnings, and rationale.

## Field naming

The schema uses Foundry's JSON contract style: `snake_case` fields such as `tool_shed_url`, `tool_id`, `trs_tool_id`, and `changeset_revision`. These map cleanly from the current TypeScript CLI surfaces (`repoName`, `toolId`, `trsToolId`, `changesetRevision`) without making the Foundry schema inherit TS implementation casing.

`repo` means the Tool Shed repository name. This intentionally differs from `repoName` in gxwf JSON because downstream Molds should see a stable Foundry contract, not a direct CLI type dump.

## Cast-time role

Per `docs/COMPILATION_PIPELINE.md`'s per-kind dispatch, this schema is referenced by [[discover-shed-tool]] via `output_artifacts[].schema` and copied verbatim into the cast bundle's `references/schemas/`. The cast skill validates its emitted recommendation with `validate-galaxy-tool-discovery` before returning; downstream phases bind to this object and would produce worse errors later.

The same object feeds several consumers:

- [[summarize-galaxy-tool]] consumes the selected Tool Shed pin after the harness has populated `galaxy-tool-cache`.
- [[author-galaxy-tool-wrapper]] receives `weak` or `miss` context when the branch falls through.
- [[implement-galaxy-tool-step]] uses the selected wrapper path indirectly, after [[summarize-galaxy-tool]] has produced a wrapper summary.

## What is intentionally not modeled

- **Cache keys.** The discovery object carries enough information to run `galaxy-tool-cache add`, but it does not freeze the cache's internal key format.
- **ParsedTool content.** Full wrapper structure belongs to [[summarize-galaxy-tool]] after cache population, not to discovery.
- **Galaxy-instance search.** Installed-tool discovery through a configured Galaxy server is a future sibling path, not part of this Tool Shed schema.
- **Automatic top-1 fetch.** A future `gxwf tool-fetch` convenience command could reduce shell steps, but it would not replace this recommendation schema because it does not model `weak`, `miss`, fallthrough context, or alternates.
