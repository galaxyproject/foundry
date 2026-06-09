---
type: research
subtype: design-spec
title: "Galaxy workflow draft format"
tags:
  - research/design-spec
  - target/galaxy
status: draft
created: 2026-05-06
revised: 2026-05-10
revision: 2
ai_generated: true
related_notes:
  - "[[gxformat2-schema]]"
  - "[[galaxy-data-flow-draft-contract]]"
  - "[[discover-shed-tool]]"
  - "[[galaxy-workflow-draft]]"
related_molds:
  - "[[nextflow-summary-to-galaxy-template]]"
  - "[[cwl-summary-to-galaxy-template]]"
  - "[[freeform-summary-to-galaxy-template]]"
  - "[[compare-against-iwc-exemplar]]"
  - "[[implement-galaxy-tool-step]]"
  - "[[advance-galaxy-draft-step]]"
summary: "gxformat2 draft superset: wrapper-tier TODOs (tool_id, tool_state, port names) plus _plan_state / _plan_context / _plan_in / _plan_out per tool step."
---

# Galaxy workflow draft format

The output artifact `galaxy-workflow-draft` produced by the `*-summary-to-galaxy-template` Molds is **gxformat2 with wrapper-tier relaxations and free-text planning fields**, sized to the gap between data-flow design and tool-resolved implementation.

Topology — workflow inputs and their collection shapes, workflow outputs, the step set, the producer→consumer edge graph, branches, and `when:` guards — is **settled by the template Mold itself**, drawing on the upstream interface and data-flow briefs (see [[galaxy-data-flow-draft-contract]]). The output is concrete gxformat2 with no topology TODOs. Everything deferred to the per-step implementation Mold is wrapper-tier: which Tool Shed wrapper, what parameters, and the wrapper-determined port names that populate `in:` / `out:` / `outputSource`.

## Relaxations vs. gxformat2

For tool steps, when the wrapper has not been picked:

- `tool_id` and `tool_version` MAY be the literal string `TODO`. Resolution belongs to [[discover-shed-tool]] and the per-step implementation Mold.
- `tool_shed_repository` (the `{ changeset_revision, name, owner, tool_shed }` block) MAY be absent.
- `tool_state` / `state` MAY be absent.
- Step `out[].id` and `in[]` keys MAY be `TODO_<hint>` sentinels (e.g. `TODO_trimmed_paired`, `TODO_input`). Workflow `outputs[].outputSource` MAY reference such a sentinel via `step/TODO_<hint>` so the connection graph still resolves syntactically. The connection itself (which step's output feeds which step's input) is topology and MUST be present; only the wrapper-determined port names are deferred.

Workflow inputs (types, collection shapes, formats, optionality), workflow outputs, step labels, and the producer→consumer edge set MUST be expressed in normal gxformat2 form with concrete values — never `TODO`. The template Mold is the locus where these decisions are made; if the upstream brief leaves a topology choice open, decide it here from source evidence, IWC exemplars, and pattern pages rather than punting downstream.

## Additions: `_plan_*` planning fields

Free-text fields per tool step capture the template Mold's intent for the downstream per-step implementation Mold. All optional, but expected on any step where `tool_id` is `TODO` or `tool_state` is absent.

- `_plan_state` — parameter binding intent: which knobs matter, value or range, why. Read by the per-step Mold to bind real `tool_state` once a wrapper is selected.
- `_plan_context` — extras the per-step Mold needs to pick a wrapper: source `command:` block, conda packages, Docker/Singularity images, environment variables, preconditions, postconditions, container entrypoints, scratch-disk needs.
- `_plan_in` — wrapper input port mapping intent. The connection graph already says "this source feeds this step"; `_plan_in` records the semantic role of each port and likely wrapper-side names (`single_paired` vs `paired_input` vs `input`) so the per-step Mold can collapse `TODO_*` keys to the real ones.
- `_plan_out` — wrapper output surface intent: which outputs downstream consumers depend on (with the existing edges as evidence) so the per-step Mold can pick a wrapper that exposes them, or insert a follow-up step if it does not.

The `_plan_*` family is **wrapper-tier**: each entry exists because the tool wrapper is not yet picked and disappears the moment one is. Topology decisions do not belong here.

`_plan_*` fields are **draft-only**. They MUST be removed before the workflow is treated as a runnable gxformat2 document. Any remaining `TODO` / `TODO_*` sentinels MUST also be resolved at the same time.

## Example (sketch)

```yaml
class: GalaxyWorkflow
inputs:
  reads:
    type: collection
    collection_type: list:paired
    format: fastqsanger.gz
outputs:
  trimmed:
    outputSource: fastp/TODO_trimmed_paired
steps:
  fastp:
    tool_id: TODO
    label: trim and QC paired reads
    in:
      TODO_input: reads
    out:
      - id: TODO_trimmed_paired
      - id: TODO_html_report
    _plan_state: |
      adapter trimming on, quality cutoff ~Q20, min length ~50.
      preserve paired-end pairing for downstream alignment.
    _plan_context: |
      upstream: nf-core FASTP module.
      conda: bioconda::fastp=0.23.4
      container: quay.io/biocontainers/fastp:0.23.4--h5f740d0_0
      precondition: paired list collection with sane element identifiers
    _plan_in: |
      single semantic port `reads`: feeds workflow `reads` (list:paired).
      wrapper input port name likely one of `single_paired` | `paired_input` |
      `input` depending on which fastp wrapper is picked.
    _plan_out: |
      need a paired output that preserves list:paired shape (downstream
      alignment step consumes it). also expose the HTML report as a
      checkpoint output for QC.
```

## Why this shape

- Keeps the artifact recognizably gxformat2 so static tooling (`gxwf validate --no-tool-state`, structural diff against IWC) still applies to topology and port wiring.
- Carves a stable handoff between the template Mold and the per-step implementation Mold without sneaking tool resolution into either side.
- Makes the boundary between topology (settled upstream) and wrapper-tier (deferred) explicit — the `_plan_*` family lives squarely on the deferred side.
- Free-text `_plan_*` is intentional for v1: it lets the templating agent record intent without a contract pretending to be parameterizable yet. Structuring those fields is open work — see each template Mold's `refinement.md`.

## Open work

- Decide whether `_plan_state` should grow structure (parameter-name hints, value ranges, references back to the source summary).
- Decide whether `_plan_context` should be split into typed fields (`source_command`, `conda`, `containers`, `env`, `pre`, `post`).
- Decide structure for `_plan_in` and `_plan_out` once two or three worked drafts exercise them. Candidate `_plan_out`: array of `{ semantic_name, downstream_consumers[], required_for }`. Candidate `_plan_in`: map keyed by the `TODO_*` placeholder key to `{ semantic_name, source_step_output, shape_constraint }`.
- Pick a JSON Schema strategy: extend the gxformat2 schema with `_plan_*` and the relaxed wrapper / port-name rules, or validate the draft via a sibling schema that wraps gxformat2 with the relaxations.
- Specify the strip step that converts a draft into a runnable gxformat2 workflow. It MUST drop all `_plan_*` fields and reject any remaining `TODO` or `TODO_<hint>` sentinel in `tool_id`, `tool_version`, `out[].id`, `in[]` keys, or `outputSource`.
