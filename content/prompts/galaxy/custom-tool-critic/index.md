---
type: prompt
title: "Galaxy custom tool critic"
tags:
  - prompt/galaxy-internal
  - target/galaxy
status: draft
created: 2026-05-07
revised: 2026-08-24
revision: 2
sources:
  - "https://github.com/galaxyproject/galaxy/blob/4d235b615e60bdb8c7e7d9ada100245068c8e4d9/lib/galaxy/agents/prompts/custom_tool_critic.md"
license: MIT
license_file: LICENSES/galaxy.LICENSE
summary: "Vendored Galaxy internal prompt for critiquing generated custom tool definitions."
---

> **Vendored from upstream**, pinned at SHA `4d235b6`. The raw prompt lives next to this note as `upstream.prompt`.
>
> **When to consult:** as provenance for the critique criteria distilled into [[galaxy-user-tool-critique]]. Not cast; no Mold references it directly.

Container critique is explicitly out of scope here — it was carved out into [[custom-tool-container-critic]], and this prompt now forbids it. What it critiques is clarity and idiomaticity, and it returns a `CritiqueReport` with a fixed `(target, attribute)` edit vocabulary and a `needs_full_refine` escape hatch. That transport is Galaxy's apply-loop; the criteria behind it are what the derived note keeps.

Casting consumes `upstream.prompt` verbatim. This wrapper exists for Foundry metadata, provenance, and human-facing usage guidance.
