---
type: prompt
title: "IWC Copilot workflow review instructions"
tags:
  - prompt/iwc-internal
  - target/galaxy
status: draft
created: 2026-09-09
revised: 2026-11-05
revision: 2
sources:
  - "https://github.com/galaxyproject/iwc/blob/fa25be50fb6157e505b330684b7dfd3c17e72eaf/.github/copilot-instructions.md"
license: MIT
license_file: LICENSES/iwc.LICENSE
summary: "Vendored IWC repository instructions that guide Copilot reviews of workflow contributions."
---

> **Vendored from upstream**, pinned at SHA `fa25be5`. The raw prompt lives next to this note as `upstream.prompt`.
>
> **When to consult:** as upstream review-criteria evidence when designing or running an IWC-compatible workflow review. These instructions shape manually requested Copilot reviews; they do not trigger a review themselves.

The instructions expand the IWC reviewer checklist into checks for Dockstore metadata, genericity, annotations, human-readable labels, naming grammar, documentation, changelogs, and tests. [[workflow-pr-review-command]] is meant to include all of them, with two differences recorded in that note's §Provenance and acceptance status. They remain a separate resource because their runtime, framing, and upstream lifecycle differ.

No Mold casts `upstream.prompt`. At review time, [[workflow-pr-review-command]] reads the pull request base's copy, and this pinned copy is what the comparison is checked against. This wrapper exists for Foundry metadata, provenance, and human-facing usage guidance.
