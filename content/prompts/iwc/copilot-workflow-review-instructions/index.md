---
type: prompt
title: "IWC Copilot workflow review instructions"
tags:
  - prompt/iwc-internal
  - target/galaxy
status: draft
created: 2026-09-09
revised: 2026-09-09
revision: 1
sources:
  - "https://github.com/galaxyproject/iwc/blob/b80bc92780089b54773f558c224a27b38baa8a06/.github/copilot-instructions.md"
license: MIT
license_file: LICENSES/iwc.LICENSE
summary: "Vendored IWC repository instructions that guide Copilot reviews of workflow contributions."
---

> **Vendored from upstream**, pinned at SHA `b80bc92`. The raw prompt lives next to this note as `upstream.prompt`.
>
> **When to consult:** as upstream review-criteria evidence when designing or running an IWC-compatible workflow review. These instructions shape manually requested Copilot reviews; they do not trigger a review themselves.

The instructions expand the IWC reviewer checklist into checks for Dockstore metadata, genericity, annotations, human-readable labels, naming grammar, documentation, changelogs, and tests. They substantially overlap the upstream Claude review command, but remain a separate resource because their runtime, framing, and upstream lifecycle differ.

Casting consumes `upstream.prompt` verbatim. This wrapper exists for Foundry metadata, provenance, and human-facing usage guidance.
