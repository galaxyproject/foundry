---
name: nextflow-summary-to-galaxy-template
description: "gxformat2 skeleton with per-step TODOs from a Nextflow summary and prior Galaxy design briefs."
---

# nextflow-summary-to-galaxy-template

Follow the procedure below and use the artifact/reference sections as the runtime contract.

## When To Use

- gxformat2 skeleton with per-step TODOs from a Nextflow summary and prior Galaxy design briefs.

## Inputs

- `summary-nextflow`; schema: summary-nextflow; producer(s): `summarize-nextflow`; Structured Nextflow pipeline summary emitted by summarize-nextflow; consulted while emitting placeholder steps.
- `nextflow-galaxy-interface`; producer(s): `nextflow-summary-to-galaxy-interface`; Galaxy interface brief from nextflow-summary-to-galaxy-interface that pins workflow inputs, outputs, labels.
- `nextflow-galaxy-data-flow`; producer(s): `nextflow-summary-to-galaxy-data-flow`; Galaxy data-flow brief from nextflow-summary-to-galaxy-data-flow that pins abstract operations and collection choices.
- `iwc-comparison-notes`; producer(s): `compare-against-iwc-exemplar`; Structural diff guidance from compare-against-iwc-exemplar (run on the design briefs); steers the skeleton toward IWC-aligned structure before per-step authoring.

## Outputs

- `galaxy-workflow-draft`; kind: `yaml`; default filename: `galaxy-workflow-draft.gxwf.yml`; gxformat2 skeleton: workflow inputs, outputs, placeholder steps, rough connections, TODO slots for later implementation Molds.

## Load Upfront

- `references/notes/galaxy-data-flow-draft-contract.md`; kind: `research`; mode: `verbatim`; Respect the handoff from abstract data-flow draft to gxformat2 skeleton; Trigger: When translating abstract nodes, unresolved tool needs, and placeholder transformations into template TODOs.
- `references/notes/gxformat2-schema.md`; kind: `research`; mode: `verbatim`; Use the gxformat2 structural vocabulary for workflow inputs, outputs, steps, and producer-side output actions while emitting the skeleton.
- `references/schemas/summary-nextflow.schema.json`; kind: `schema`; mode: `verbatim`; Read process, channel, operator, and fixture structure when emitting placeholder steps and TODO context.

## Load On Demand

- `references/patterns/galaxy-collection-patterns.md`; kind: `pattern`; mode: `verbatim`; Use corpus-grounded collection pattern guidance for unresolved skeleton steps; Trigger: When adding TODO steps for collection cleanup, reshaping, relabeling, identifier synchronization, or collection-tabular bridges.
- `references/patterns/galaxy-tabular-patterns.md`; kind: `pattern`; mode: `verbatim`; Use corpus-grounded tabular pattern guidance for unresolved skeleton steps; Trigger: When adding TODO steps for tabular filtering, projection, joins, aggregation, text-processing recipes, or tabular-collection bridges.
- `references/notes/galaxy-collection-semantics.md`; kind: `research`; mode: `verbatim`; Preserve Galaxy collection typing and map-over/reduction semantics in the gxformat2 skeleton; Trigger: When creating workflow inputs, outputs, and placeholder connections involving collections.
- `references/notes/galaxy-workflow-testability-design.md`; kind: `research`; mode: `verbatim`; Choose stable workflow input/output labels, testable checkpoint outputs, and fixture-compatible workflow interfaces while drafting the skeleton; Trigger: When the template decides workflow inputs, workflow outputs, promoted checkpoints, or collection output identifiers that future tests will need to address.

## Validation

- None declared.

## Procedure

Read the original Nextflow source artifact, the `summary-nextflow.json` summary, the Nextflow-to-Galaxy interface brief, and the Nextflow-to-Galaxy data-flow brief. Emit a gxformat2 skeleton with workflow inputs, workflow outputs, placeholder steps, rough connections, and TODO slots for later implementation skills.

The interface and data-flow briefs guide the skeleton, but they do not replace source evidence. Treat the prior-step index as the working context: Nextflow source, source summary, interface brief, data-flow brief, and any open questions carried forward.

## Runtime Notes

- Do not read Foundry source files at runtime; use only files packaged in this skill bundle and user-supplied artifacts.
- Preserve declared artifact filenames unless the user or harness supplies explicit paths.
- Carry unresolved assumptions into the output artifact instead of silently inventing missing source evidence.
