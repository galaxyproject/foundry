---
type: prompt
title: "IWC workflow pull request review command"
tags:
  - prompt/iwc-internal
  - target/galaxy
status: draft
created: 2026-09-09
revised: 2026-11-05
revision: 4
sources:
  - "https://github.com/galaxyproject/iwc/blob/fa25be50fb6157e505b330684b7dfd3c17e72eaf/.claude/commands/review.md"
license: MIT
license_file: LICENSES/iwc.LICENSE
summary: "Vendored IWC command for reviewing a workflow pull request against the contributor and reviewer checklist."
---

> **Vendored from upstream**, pinned at SHA `fa25be5`. The raw prompt lives next to this note as `upstream.prompt`.
>
> **When to consult:** as upstream procedural evidence for a Mold that reviews an IWC or IWC Lab workflow submission. This is a repository-local review command, not a GitHub Actions workflow.

The command is the consolidated IWC workflow-review procedure. It tells an agent to read policy from the pull request base, inspect relevant CI evidence and complete files, assess every checklist item, distinguish required fixes from optional improvements, and return an evidenced advisory recommendation. Consumers should treat it as a pinned procedure rather than permanently current policy.

Casting consumes `upstream.prompt` verbatim. This wrapper exists for Foundry metadata, provenance, and human-facing usage guidance.

## Provenance and acceptance status

- **Pin of record:** the `vendored_upstreams.yml` entry for `upstream.prompt`. That entry, this note's `sources:` URL, and the blockquote above are the only places this repository states the SHA. No Mold, eval, scenario, or Pipeline restates it; a runtime reports the hash recorded for this reference in its cast's provenance record instead.
- **Acceptance:** accepted. The pin is the merge commit of galaxyproject/iwc#1366, on `galaxyproject/iwc` `main`.
- **Claude-versus-Copilot superset comparison:** the command tells the reviewer to read the pull request base's copy of [[copilot-workflow-review-instructions]] and apply the union of its requirements, and its checklist is meant to include all of them. Reading both files at this pin shows two differences:
  - **Semantic versioning.** The Copilot instructions say to follow it. The command instead sends an apparently breaking change to human versioning review, because it records that IWC changelogs do not necessarily follow semantic versioning. Foundry's review keeps the command's behavior.
  - **Unlabelled outputs.** The Copilot instructions say every `workflow_outputs` section must have a human-readable label. The checklist only judges labels that exist, so a review that works the checklist alone can miss an output with no label.
- **Keeping the comparison current:** upstream requires the superset to hold, so repeat this comparison at each re-pin. Record any new gap here and resolve it upstream, or revisit the decision to run a single review rather than silently dropping the difference.

Refreshing the pin is: re-vendor `upstream.prompt`, update the `vendored_upstreams.yml` entry, update `sources:`, the blockquote, this section, `revised:`, and `revision:` — then `make casts`. Move [[copilot-workflow-review-instructions]] to the same commit the same way, so the comparison describes one upstream revision. Nothing else in the repository needs to change.
