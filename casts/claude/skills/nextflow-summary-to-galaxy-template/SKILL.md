---
name: nextflow-summary-to-galaxy-template
description: "gxformat2 skeleton with per-step TODOs from a Nextflow summary and prior Galaxy design briefs."
---

# nextflow-summary-to-galaxy-template

Follow the procedure below and use the artifact/reference sections as the runtime contract.

## When To Use

- gxformat2 skeleton with per-step TODOs from a Nextflow summary and prior Galaxy design briefs.

## Inputs

- Read artifact `summary-nextflow`. Schema: summary-nextflow. Produced by `summarize-nextflow`. Structured Nextflow pipeline summary emitted by summarize-nextflow; consulted while emitting placeholder steps.
- Read artifact `nextflow-galaxy-interface`. Produced by `nextflow-summary-to-galaxy-interface`. Galaxy interface brief from nextflow-summary-to-galaxy-interface that pins workflow inputs, outputs, labels.
- Read artifact `nextflow-galaxy-data-flow`. Produced by `nextflow-summary-to-galaxy-data-flow`. Galaxy data-flow brief from nextflow-summary-to-galaxy-data-flow that pins abstract operations and collection choices.
- Read artifact `iwc-comparison-notes`. Produced by `compare-against-iwc-exemplar`. Structural diff guidance from compare-against-iwc-exemplar (run on the design briefs); steers the skeleton toward IWC-aligned structure before per-step authoring.

## Outputs

- Write artifact `galaxy-workflow-draft` as `galaxy-workflow-draft.gxwf.yml`. Format: `yaml`. gxformat2 skeleton: workflow inputs, outputs, placeholder steps, rough connections, TODO slots for later implementation Molds.

## Load Upfront

- `references/notes/galaxy-data-flow-draft-contract.md`: Research note copied verbatim into the bundle. Respect the handoff from abstract data-flow draft to gxformat2 skeleton. Use when: translating abstract nodes, unresolved tool needs, and placeholder transformations into template TODOs.
- `references/notes/gxformat2-schema.md`: Research note copied verbatim into the bundle. Use the gxformat2 structural vocabulary for workflow inputs, outputs, steps, and producer-side output actions while emitting the skeleton.
- `references/schemas/summary-nextflow.schema.json`: Schema file copied verbatim into the bundle. Read process, channel, operator, and fixture structure when emitting placeholder steps and TODO context.

## Load On Demand

- `references/patterns/galaxy-collection-patterns.md`: Pattern note copied verbatim into the bundle. Use corpus-grounded collection pattern guidance for unresolved skeleton steps. Use when: adding TODO steps for collection cleanup, reshaping, relabeling, identifier synchronization, or collection-tabular bridges.
- `references/patterns/galaxy-tabular-patterns.md`: Pattern note copied verbatim into the bundle. Use corpus-grounded tabular pattern guidance for unresolved skeleton steps. Use when: adding TODO steps for tabular filtering, projection, joins, aggregation, text-processing recipes, or tabular-collection bridges.
- `references/notes/galaxy-collection-semantics.md`: Research note copied verbatim into the bundle. Preserve Galaxy collection typing and map-over/reduction semantics in the gxformat2 skeleton. Use when: creating workflow inputs, outputs, and placeholder connections involving collections.
- `references/notes/galaxy-workflow-testability-design.md`: Research note copied verbatim into the bundle. Choose stable workflow input/output labels, testable checkpoint outputs, and fixture-compatible workflow interfaces while drafting the skeleton. Use when: the template decides workflow inputs, workflow outputs, promoted checkpoints, or collection output identifiers that future tests will need to address.
- `references/notes/nextflow-conditional-to-galaxy-subworkflow-when.md`: Research note copied verbatim into the bundle. Emit `when:` clauses on the right step type (subworkflow vs tool) and the right output fan-in primitive (`pick_value`, modes `first_non_null` / `first_or_skip` / `the_only_non_null`) when the data-flow brief carries a conditional disposition through to the skeleton. Use when: the upstream data-flow brief assigns a source conditional to a subworkflow `when:` or inline `when:` shape, or when emitting the merge step for two or more `when:`-gated branches that produce the same logical output.

## Validation

- None declared.

## Procedure

Read the original Nextflow source artifact, the `summary-nextflow.json` summary, the Nextflow-to-Galaxy interface brief, and the Nextflow-to-Galaxy data-flow brief. Emit a gxformat2 skeleton with workflow inputs, workflow outputs, placeholder steps, rough connections, and TODO slots for later implementation skills.

The interface and data-flow briefs guide the skeleton, but they do not replace source evidence. Treat the prior-step index as the working context: Nextflow source, source summary, interface brief, data-flow brief, and any open questions carried forward.

## Runtime Notes

- Do not read Foundry source files at runtime; use only files packaged in this skill bundle and user-supplied artifacts.
- Preserve declared artifact filenames unless the user or harness supplies explicit paths.
- Carry unresolved assumptions into the output artifact instead of silently inventing missing source evidence.
