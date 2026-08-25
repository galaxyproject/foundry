---
type: prompt
title: "Galaxy custom tool container critic"
tags:
  - prompt/galaxy-internal
  - target/galaxy
status: draft
created: 2026-08-24
revised: 2026-08-24
revision: 1
sources:
  - "https://github.com/galaxyproject/galaxy/blob/4d235b615e60bdb8c7e7d9ada100245068c8e4d9/lib/galaxy/agents/prompts/custom_tool_container_critic.md"
license: MIT
license_file: LICENSES/galaxy.LICENSE
summary: "Vendored Galaxy internal prompt inferring the conda packages a generated custom tool needs."
---

> **Vendored from upstream**, pinned at SHA `4d235b6`. The raw prompt lives next to this note as `upstream.prompt`.
>
> **When to consult:** as provenance for the package-inference method distilled into [[galaxy-user-tool-authoring]]. Not cast; no Mold references it directly.

Not a critic in the reviewing sense. It reads a tool's `shell_command` and configfiles and nothing else, and returns conda package names — upstream's `_infer_packages` then hands that list to a deterministic `recommend_container` lookup that resolves and verifies a `quay.io/biocontainers` image. The prompt is half a mechanism; the half that picks an image is Python, and Foundry does not carry it.

Its container section was carved out of [[custom-tool-critic]], which now forbids container critique outright. What survives the split and is worth reusing is the inference method itself — canonical conda names, versions only when the command pins one, coreutils ignored, empty list as a real answer — and that is what the derived note holds.

Casting consumes `upstream.prompt` verbatim. This wrapper exists for Foundry metadata, provenance, and human-facing usage guidance.
