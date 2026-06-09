---
type: research
subtype: design-spec
title: "Galaxy tool summary input source"
tags:
  - research/design-spec
  - target/galaxy
status: draft
created: 2026-05-03
revised: 2026-05-03
revision: 2
ai_generated: true
related_notes:
  - "[[component-tool-shed-search]]"
related_molds:
  - "[[discover-shed-tool]]"
  - "[[summarize-galaxy-tool]]"
summary: "Decides that summarize-galaxy-tool reads cached ParsedTool JSON as its v1 input source."
---

# Galaxy Tool Summary Input Source

## Decision

`summarize-galaxy-tool` reads `galaxy-tool-cache` ParsedTool JSON populated from the Tool Shed pin emitted by `discover-shed-tool`.

The v1 handoff is:

1. `discover-shed-tool` emits `(tool_shed_url, owner, repo, tool_id, version, changeset_revision)` plus confidence evidence.
2. The harness or caller runs `galaxy-tool-cache add toolshed.g2.bx.psu.edu/repos/<owner>/<repo>/<tool_id> --tool-version <version>` using the chosen pin.
3. `summarize-galaxy-tool` loads the cached ParsedTool JSON and emits the Foundry-owned Galaxy tool summary schema once that schema exists.

## Rationale

This source is already implied by the discovery chain and avoids making `summarize-galaxy-tool` repeat Tool Shed search, version selection, or Mercurial materialization.

ParsedTool JSON is better than raw XML as the primary input because it exposes a normalized parse surface for inputs, outputs, requirements, tests, and command/source metadata. Raw XML remains supporting evidence only when the parsed object is lossy or ambiguous.

Galaxy API input is deferred. It is useful for installed-only tools and instance-local wrappers, but it changes the trust and availability model: the result depends on a configured Galaxy instance instead of the Tool Shed pin selected by `discover-shed-tool`.

## Non-Goals

- Do not summarize directly from a Tool Shed search hit; hits do not include enough version or changeset detail.
- Do not make raw Tool Shed tarball XML the normal input; use it only to resolve ambiguity in the cached parse.
- Do not support installed-Galaxy-only tools in v1; add a sibling discovery/input path when a pipeline needs it.

## Open Work

- Add `content/schemas/summary-galaxy-tool.schema.json` and a companion schema note.
- Seed the `galaxy-tool-cache add` CLI manual page if Molds begin referencing it directly.
