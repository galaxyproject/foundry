---
type: prompt
title: "Galaxy custom tool structured generator"
tags:
  - prompt
  - prompt/galaxy-internal
  - target/galaxy
status: draft
created: 2026-05-07
revised: 2026-05-07
revision: 1
ai_generated: false
sources:
  - "https://github.com/dannon/galaxy/blob/69d0c697b495b7f16b1475c00c8bfbd7b9bfa85e/lib/galaxy/agents/prompts/custom_tool_structured.md"
prompt_file: custom-tool-structured.upstream.prompt
license: MIT
license_file: LICENSES/galaxy.LICENSE
summary: "Vendored Galaxy internal prompt for generating structured custom tool definitions."
---

> **Vendored from upstream**, pinned at SHA `69d0c69`. The raw prompt lives next to this note as `custom-tool-structured.upstream.prompt`.
>
> **When to consult:** generating Galaxy `GalaxyUserTool` definitions from user requests, especially when producing schema-shaped YAML for custom tools.

Casting consumes `prompt_file` verbatim. This wrapper exists for Foundry metadata, provenance, and human-facing usage guidance.
