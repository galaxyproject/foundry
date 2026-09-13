---
type: prompt
title: "IWC workflow pull request review command"
tags:
  - prompt/iwc-internal
  - target/galaxy
status: draft
created: 2026-09-09
revised: 2026-09-12
revision: 3
sources:
  - "https://github.com/jmchilton/iwc/blob/d7012eb5fe40b471853acb2866a2a8af334d4c4a/.claude/commands/review.md"
license: MIT
license_file: LICENSES/iwc.LICENSE
summary: "Vendored IWC command for reviewing a workflow pull request against the contributor and reviewer checklist."
---

> **Vendored from the proposed upstream review overhaul**, pinned at SHA `d7012eb`. The raw prompt lives next to this note as `upstream.prompt`.
>
> **When to consult:** as upstream procedural evidence for a Mold that reviews an IWC or IWC Lab workflow submission. This is a repository-local review command, not a GitHub Actions workflow.

The command is the consolidated IWC workflow-review procedure. It tells an agent to read policy from the pull request base, inspect relevant CI evidence and complete files, assess every checklist item, distinguish required fixes from optional improvements, and return an evidenced advisory recommendation. Consumers should treat it as a pinned procedure rather than permanently current policy.

Casting consumes `upstream.prompt` verbatim. This wrapper exists for Foundry metadata, provenance, and human-facing usage guidance.

## Provenance and acceptance status

- **Pin of record:** the `vendored_upstreams.yml` entry for `upstream.prompt`. That entry, this note's `sources:` URL, and the blockquote above are the only places this repository states the SHA. No Mold, eval, scenario, or Pipeline restates it; a runtime reports the hash recorded for this reference in its cast's provenance record instead.
- **Acceptance:** proposed, not accepted. galaxyproject/iwc#1366 is still open, so this pin is a proposed revision of the review policy rather than accepted upstream policy. Anything consuming it should say so.
- **Claude-versus-Copilot superset comparison:** not yet performed. Record the finding here once #1366 is accepted. If the accepted command is not a semantic superset of [[copilot-workflow-review-instructions]], record the specific gaps here and resolve them upstream, or revisit the one-pass decision explicitly rather than silently dropping the difference.

Refreshing the pin is: re-vendor `upstream.prompt`, update the `vendored_upstreams.yml` entry, update `sources:`, the blockquote, this section, `revised:`, and `revision:` — then `make casts`. Nothing else in the repository needs to change.
