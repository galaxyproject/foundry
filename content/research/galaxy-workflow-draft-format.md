---
type: research
subtype: design-spec
title: "Galaxy workflow draft format"
tags:
  - research/design-spec
  - target/galaxy
status: draft
created: 2026-05-06
revised: 2026-05-06
revision: 1
ai_generated: true
related_notes:
  - "[[gxformat2-schema]]"
  - "[[galaxy-data-flow-draft-contract]]"
  - "[[discover-shed-tool]]"
related_molds:
  - "[[nextflow-summary-to-galaxy-template]]"
  - "[[cwl-summary-to-galaxy-template]]"
  - "[[paper-summary-to-galaxy-template]]"
  - "[[compare-against-iwc-exemplar]]"
  - "[[implement-galaxy-tool-step]]"
summary: "gxformat2 draft superset: tool_id / tool_state / tool_shed_repository may be deferred; per-step _plan_state and _plan_context carry planning intent."
---

# Galaxy workflow draft format

The output artifact `galaxy-workflow-draft` produced by the `*-summary-to-galaxy-template` Molds is **gxformat2 with two relaxations and two additions**, sized to the gap between data-flow design and tool-resolved implementation.

## Relaxations vs. gxformat2

For tool steps:

- `tool_id` and `tool_version` MAY be the literal string `TODO` when the template Mold has not resolved a Tool Shed wrapper. Resolution belongs to [[discover-shed-tool]] and the per-step implementation Mold.
- `tool_shed_repository` (the `{ changeset_revision, name, owner, tool_shed }` block) MAY be absent. Filled in once a wrapper is pinned.
- `tool_state` / `state` MAY be absent. Filled in once parameters are bound.

Inputs, outputs, labels, and the connection graph SHOULD be expressed in normal gxformat2 form so that downstream comparison against IWC exemplars and topology checks still work on the draft.

## Additions: `_plan_*` planning fields

Two free-text fields per tool step capture the template Mold's intent for the downstream per-step implementation Mold. Both are optional but expected on any step where `tool_id` is `TODO` or `tool_state` is absent.

- `_plan_state` — free-text description of the parameters the step is expected to set: which knobs matter, value or range, why. Read by the per-step Mold to bind real `tool_state` once a wrapper is selected.
- `_plan_context` — free-text description of extra context the templating agent thinks is relevant for the per-step Mold. Examples: source `command:` block, conda packages, Docker/Singularity images, environment variables, preconditions, postconditions, container entrypoints, scratch-disk needs.

`_plan_*` fields are **draft-only**. They MUST be removed before the workflow is treated as a runnable gxformat2 document.

## Example (sketch)

```yaml
class: GalaxyWorkflow
inputs:
  reads:
    type: collection
    collection_type: list:paired
    format: fastqsanger.gz
outputs:
  counts:
    outputSource: featurecounts/counts
steps:
  fastp:
    tool_id: TODO
    label: trim and QC paired reads
    in:
      input: reads
    _plan_state: |
      adapter trimming on, quality cutoff ~Q20, min length ~50.
      preserve paired-end pairing for downstream alignment.
    _plan_context: |
      upstream: nf-core FASTP module.
      conda: bioconda::fastp=0.23.4
      container: quay.io/biocontainers/fastp:0.23.4--h5f740d0_0
      precondition: paired list collection with sane element identifiers
```

## Why this shape

- Keeps the artifact recognizably gxformat2 so static tooling (`gxwf validate --no-tool-state`, structural diff against IWC) still applies.
- Carves a stable handoff between the template Mold and the per-step implementation Mold without sneaking tool resolution into either side.
- Free-text `_plan_*` is intentional for v1: it lets the templating agent record intent without a contract pretending to be parameterizable yet. Structuring those fields is open work — see the `nextflow-summary-to-galaxy-template` refinement note.

## Open work

- Decide whether `_plan_state` should grow structure (parameter-name hints, value ranges, references back to the source summary).
- Decide whether `_plan_context` should be split into typed fields (`source_command`, `conda`, `containers`, `env`, `pre`, `post`).
- Pick a JSON Schema strategy: extend the gxformat2 schema with `_plan_*` and relaxed tool fields, or validate the draft via a sibling schema that wraps gxformat2 with the relaxations.
- Decide whether `_plan_*` fields belong on non-tool steps (subworkflow, pause, input).
- Specify the strip-step that converts a draft into a runnable gxformat2 workflow once `tool_id`, `tool_state`, and `tool_shed_repository` are resolved.
