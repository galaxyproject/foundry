---
type: prompt
title: "IWC workflow pull request review command"
tags:
  - prompt/iwc-internal
  - target/galaxy
status: draft
created: 2026-09-09
revised: 2026-09-09
revision: 1
sources:
  - "https://github.com/galaxyproject/iwc/blob/b80bc92780089b54773f558c224a27b38baa8a06/.claude/commands/review.md"
license: MIT
license_file: LICENSES/iwc.LICENSE
summary: "Vendored IWC Claude command for reviewing a workflow pull request against the contributor and reviewer checklist."
---

> **Vendored from upstream**, pinned at SHA `b80bc92`. The raw prompt lives next to this note as `upstream.prompt`.
>
> **When to consult:** as upstream procedural evidence for a Mold that reviews an IWC or IWC Lab workflow submission. This is a local Claude command, not a GitHub Actions workflow.

The command tells an agent to fetch a pull request, assess each IWC reviewer-checklist item, inspect every workflow-output label, check naming grammar and consistency, and return a pass/warn/not-applicable summary with a recommendation. Its checklist is copied into the prompt rather than resolved from the pull request template, so consumers should treat it as a pinned upstream review procedure rather than a permanently current policy source.

Casting consumes `upstream.prompt` verbatim. This wrapper exists for Foundry metadata, provenance, and human-facing usage guidance.
