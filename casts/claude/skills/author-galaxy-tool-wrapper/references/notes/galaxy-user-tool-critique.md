---
type: research
title: "Galaxy user-defined tool critique criteria"
tags:
  - target/galaxy
status: draft
created: 2026-08-24
revised: 2026-08-24
revision: 1
component: tool_util_models
related_notes:
  - "[[galaxy-user-tool-authoring]]"
sources:
  - "https://github.com/galaxyproject/galaxy/blob/4d235b615e60bdb8c7e7d9ada100245068c8e4d9/lib/galaxy/agents/prompts/custom_tool_critic.md"
summary: "What to flag in a structurally-valid GalaxyUserTool definition, what to leave alone, and when a fix is structural."
---

The fuzzy quality pass on a `GalaxyUserTool` definition that has **already passed structural validation** — clarity, idiomaticity, sensible defaults, helpful text. Derived from the vendored [[custom-tool-critic]] prompt.

Load this after validation, not before. Its whole premise is that ids are well-formed, referenced inputs are declared, and the container shape is recognized. Running it on an invalid draft produces critique of things that should have been fixed as authoring errors — see [[galaxy-user-tool-authoring]].

## Clarity — text an end user reads

- `description` does not say what the tool actually does, or is generic ("Run the tool", "Process input").
- `name` is opaque, or does not match the description.
- An input `label` is missing, or just restates the parameter name.
- An input `help` is missing on a non-obvious parameter.
- An output `label` is missing or unclear.

## Idiomaticity — the shape of the tool

- `shell_command` quoting that will not escape correctly — bare `$(date)` where `\$(date)` is meant.
- An optional **text**, **integer**, **float** or **boolean** parameter with no `value`, forcing the user to supply something that should have been sensible. The field is `value`; `default` is not accepted and fails validation. **select** parameters take no `value` — their default is `selected: true` on an option — and **data** parameters take none either, so never ask for one on those.
- Common analysis options not exposed — a BWA tool with no `-t` threads input.
- A file output declared without `from_work_dir` or a matching command output. Structural validation should have caught these; flag borderline cases.

## Containers are out of scope

Do not flag, judge, or second-guess the `container` image here. Container choice is decided at authoring time from source evidence (§7 of [[galaxy-user-tool-authoring]]), and critique of it at this stage is redundant and may conflict with that decision.

This is a deliberate narrowing: the criterion "container is a generic image like `ubuntu:latest` when a biocontainer exists" used to live in this critique and was removed from it upstream when container inference became its own step.

## What not to flag

- Anything deterministic validation already catches — undeclared `inputs.X` references, container shape, citations, tool id format. Assume it passed.
- Style preferences that affect neither correctness nor clarity ("I'd name this differently").

## Supply the fix, and know when it is structural

Every issue comes with its correction. The distinction that matters is **text-level versus structural**, because it decides whether the draft is patched or regenerated.

**Text-level** — apply directly to the named field:

- the tool's `description`, `name`, or `shell_command`
- an input's `label` or `help`
- an output's `label`

**Structural** — anything else: adding or removing an input or output, exposing a new parameter, setting a parameter's `value`. Do not improvise these as field edits. Describe the change and regenerate.

Be parsimonious about calling something structural. Text edits are cheap; regeneration is not, and it re-rolls everything that was already right. Reserve it for genuine structural problems, not cosmetic text fixes.

Re-validate structurally after applying edits — a `shell_command` edit can break name matching.

## Upstream transport, not reproduced here

Upstream returns a `CritiqueReport` with `clarity_issues`, `idiomaticity_issues`, a list of `edits` restricted to a fixed `(target, attribute)` vocabulary, `needs_full_refine`, and a one-sentence `summary`. That structure exists because Galaxy applies the edits programmatically. The text/structural criterion above is the part worth carrying; the wire format is not.
