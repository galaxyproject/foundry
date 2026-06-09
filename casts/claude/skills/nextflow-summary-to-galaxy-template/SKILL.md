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
- Read artifact `nextflow-galaxy-reference-data`. Produced by `nextflow-summary-to-galaxy-reference-data`. Reference-data shape brief from nextflow-summary-to-galaxy-reference-data that pins per-asset reference inputs, optionality, datatype hints, and rebuild-on-absence behavior the skeleton must honor.
- Read artifact `nextflow-galaxy-interface`. Produced by `nextflow-summary-to-galaxy-interface`. Galaxy interface brief from nextflow-summary-to-galaxy-interface that pins workflow inputs, outputs, labels.
- Read artifact `nextflow-galaxy-data-flow`. Produced by `nextflow-summary-to-galaxy-data-flow`. Galaxy data-flow brief from nextflow-summary-to-galaxy-data-flow that pins abstract operations and collection choices.
- Read artifact `iwc-comparison-notes`. Produced by `compare-against-iwc-exemplar`. Structural diff guidance from compare-against-iwc-exemplar (run on the design briefs); steers the skeleton toward IWC-aligned structure before per-step authoring.

## Outputs

- Write artifact `galaxy-workflow-draft` as `galaxy-workflow-draft.gxwf.yml`. Format: `yaml`. Schema: galaxy-workflow-draft. gxformat2 draft (see galaxy-workflow-draft-format): topology fully resolved (workflow inputs, outputs, step set, edges); tool_id / tool_state / tool_shed_repository and wrapper-determined port names may be TODO with free-text _plan_state / _plan_context / _plan_in / _plan_out per step for later implementation Molds.

## Required Tools

- **`gxwf`** (gxwf). `npm install -g @galaxy-tool-util/cli`.
  Ephemeral run: `npx --package @galaxy-tool-util/cli gxwf`.
  Check: `gxwf --version`.
  Docs: https://github.com/jmchilton/galaxy-tool-util-ts/tree/main/packages/cli

## Load Upfront

- `references/notes/galaxy-data-flow-draft-contract.md`: Research note copied verbatim into the bundle. Respect the handoff from abstract data-flow draft to gxformat2 skeleton. Use when: translating abstract nodes, unresolved tool needs, and placeholder transformations into template TODOs.
- `references/notes/galaxy-workflow-draft-format.md`: Research note copied verbatim into the bundle. Emit the gxformat2 draft superset: TODO tool_id, optional tool_state / tool_shed_repository, and per-step _plan_state / _plan_context planning fields.
- `references/notes/gxformat2-schema.md`: Research note copied verbatim into the bundle. Use the gxformat2 structural vocabulary for workflow inputs, outputs, steps, and producer-side output actions while emitting the skeleton.
- `references/schemas/summary-nextflow.schema.json`: Schema file copied verbatim into the bundle. Read process, channel, operator, and fixture structure when emitting placeholder steps and TODO context.
- `references/schemas/galaxy-workflow-draft.schema.json`: Schema file copied verbatim into the bundle. Output contract: the emitted gxformat2 draft conforms to galaxy-workflow-draft. Cast bundles the JSON Schema so the skill carries its output shape alongside the draft-validate CLI checks.

## Load On Demand

- `references/cli/draft-validate.json`: CLI command reference packaged as a sidecar. Validate the emitted draft against draft-contract rules (sentinel form, topology, _plan_* placement) before handing off. Use when: after writing or modifying the draft workflow file.
- `references/patterns/galaxy-collection-patterns.md`: Pattern note copied verbatim into the bundle. Use corpus-grounded collection pattern guidance for unresolved skeleton steps. Use when: adding TODO steps for collection cleanup, reshaping, relabeling, identifier synchronization, or collection-tabular bridges.
- `references/patterns/galaxy-tabular-patterns.md`: Pattern note copied verbatim into the bundle. Use corpus-grounded tabular pattern guidance for unresolved skeleton steps. Use when: adding TODO steps for tabular filtering, projection, joins, aggregation, text-processing recipes, or tabular-collection bridges.
- `references/notes/galaxy-collection-semantics.md`: Research note copied verbatim into the bundle. Preserve Galaxy collection typing and map-over/reduction semantics in the gxformat2 skeleton. Use when: creating workflow inputs, outputs, and placeholder connections involving collections.
- `references/notes/galaxy-workflow-testability-design.md`: Research note copied verbatim into the bundle. Choose stable workflow input/output labels, testable checkpoint outputs, and fixture-compatible workflow interfaces while drafting the skeleton. Use when: the template decides workflow inputs, workflow outputs, promoted checkpoints, or collection output identifiers that future tests will need to address.
- `references/notes/nextflow-conditional-to-galaxy-subworkflow-when.md`: Research note copied verbatim into the bundle. Emit `when:` clauses on the right step type (subworkflow vs tool) and the right output fan-in primitive (`pick_value`, modes `first_non_null` / `first_or_skip` / `the_only_non_null`) when the data-flow brief carries a conditional disposition through to the skeleton. Use when: the upstream data-flow brief assigns a source conditional to a subworkflow `when:` or inline `when:` shape, or when emitting the merge step for two or more `when:`-gated branches that produce the same logical output.
- `references/notes/nextflow-reference-data-classification.md`: Research note copied verbatim into the bundle. Cross-check source-side reference-data classifications before committing reference assets, optional inputs, and rebuild behavior into the gxformat2 skeleton. Use when: emitting workflow inputs or input-connection wiring for reference assets and the reference-data brief is silent, low-confidence, or conflicts with source evidence for iGenomes-derived params, coordinated bundles, compute-if-missing branches, multi-DB pick-lists, or cohort-specific assets.
- `references/notes/nextflow-to-galaxy-reference-data-mapping.md`: Research note copied verbatim into the bundle. Resolve reference-asset declarations into gxformat2 inputs with the right datatype, optionality, and rebuild-on-absence wiring; cross-check the upstream brief against the datatypes table and v1 posture when the brief is silent or low-confidence on a specific asset. Use when: emitting workflow inputs or input-connection wiring for any reference asset flagged in the reference-data brief (FASTA, fai, dict, indexes, dbsnp, known_indels, intervals, PoN, …), or when the source pipeline declares iGenomes-derived params, per-asset reference path params, or any compute-if-missing index-building branch.

## Validation

- Validate `galaxy-workflow-draft.gxwf.yml` for artifact `galaxy-workflow-draft` against the galaxy-workflow-draft schema when a validator is available.

## Procedure

Read the original Nextflow source artifact, the `summary-nextflow.json` summary, the Nextflow-to-Galaxy reference-data brief, the Nextflow-to-Galaxy interface brief, and the Nextflow-to-Galaxy data-flow brief. Emit a gxformat2 skeleton with workflow inputs, workflow outputs, placeholder steps, rough connections, and TODO slots for later implementation skills.

The reference-data, interface, and data-flow briefs guide the skeleton, but they do not replace source evidence. Treat the prior-step index as the working context: Nextflow source, source summary, reference-data brief, interface brief, data-flow brief, and any open questions carried forward.

Topology is this skill's job to settle. The output must be concrete gxformat2: workflow inputs with their final collection shapes and formats, workflow outputs, the step set, the producer→consumer edge graph, branches, and `when:` guards are all decided here. The upstream interface and data-flow briefs guide those decisions, but if they hedge or leave a topology choice open, this skill makes the call from source evidence, IWC exemplars, and pattern pages — never emit a topology `TODO`. What is deferred to per-step authoring is strictly wrapper-tier: `tool_id`, `tool_version`, `tool_shed_repository`, `tool_state`, and the wrapper-determined port names that surface in `in:` / `out:` / `outputSource`. Capture deferred intent in the `_plan_*` family (`_plan_state`, `_plan_context`, `_plan_in`, `_plan_out`) so the per-step skill has the source evidence and constraints it needs.

Defer thoughtfully. When research surfaces a Foundry pattern page that names the exact recipe — a galaxy-collection-patterns reshape, a conditional-run-optional-step gate, a galaxy-tabular-patterns filter — fill the step in as completely as the pattern allows: concrete `tool_id`, parameters, port names from the pattern's worked example. Pattern pages encode resolved choices; emitting `TODO` over a covered recipe discards real evidence the per-step skill cannot recover. Defer only when the step is a domain-specific scientific tool with no covering pattern (alignment, variant calling, expression quantification, etc.), and pack `_plan_context` with the source command, conda specs, container tags, and pre/post conditions the per-step skill will need to pick a wrapper.

Output shape is gxformat2 with wrapper-tier relaxations and `_plan_state` / `_plan_context` / `_plan_in` / `_plan_out` per tool step — see galaxy-workflow-draft-format. Refinement open work for those planning fields lives in `refinement.md`.

## Runtime Notes

- Do not read Foundry source files at runtime; use only files packaged in this skill bundle and user-supplied artifacts.
- Preserve declared artifact filenames unless the user or harness supplies explicit paths.
- Carry unresolved assumptions into the output artifact instead of silently inventing missing source evidence.
