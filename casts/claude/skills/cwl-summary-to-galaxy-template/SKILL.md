---
name: cwl-summary-to-galaxy-template
description: "gxformat2 skeleton with per-step TODOs from a CWL summary and prior Galaxy design briefs."
---

# cwl-summary-to-galaxy-template

Follow the procedure below and use the artifact/reference sections as the runtime contract.

## When To Use

- gxformat2 skeleton with per-step TODOs from a CWL summary and prior Galaxy design briefs.

## Inputs

- Read artifact `summary-cwl`. Schema: summary-cwl. Produced by `summarize-cwl`. Structured CWL summary emitted by summarize-cwl; consulted while emitting placeholder steps.
- Read artifact `cwl-galaxy-interface`. Produced by `cwl-summary-to-galaxy-interface`. Galaxy interface brief from cwl-summary-to-galaxy-interface that pins workflow inputs, outputs, labels.
- Read artifact `cwl-galaxy-data-flow`. Produced by `cwl-summary-to-galaxy-data-flow`. Galaxy data-flow brief from cwl-summary-to-galaxy-data-flow that pins abstract operations and collection choices.
- Read artifact `iwc-comparison-notes`. Produced by `compare-against-iwc-exemplar`. Structural diff guidance from compare-against-iwc-exemplar (run on the design briefs); steers the skeleton toward IWC-aligned structure before per-step authoring. Carries an inline gxformat2 excerpt of the nearest exemplar.
- Read artifact `iwc-exemplar-gxformat2`. Produced by `compare-against-iwc-exemplar`. Cleaned gxformat2 view of the nearest IWC exemplar's relevant subgraph from compare-against-iwc-exemplar; pattern-match the draft's input/collection shapes, map-over wiring, output promotion, and post-job actions against this concrete idiom. Absent when no nearest exemplar was found.

## Outputs

- Write artifact `galaxy-workflow-draft` as `galaxy-workflow-draft.gxwf.yml`. Format: `yaml`. Schema: galaxy-workflow-draft. gxformat2 draft (see galaxy-workflow-draft-format): topology fully resolved (workflow inputs, outputs, step set, edges); tool_id / tool_state / tool_shed_repository and wrapper-determined port names may be TODO with free-text _plan_state / _plan_context / _plan_in / _plan_out per step for later implementation Molds.

## Required Tools

- **`gxwf`** (gxwf). `npm install -g @galaxy-tool-util/cli`.
  Ephemeral run: `npx --package @galaxy-tool-util/cli gxwf`.
  Check: `gxwf --version`.
  Docs: https://github.com/jmchilton/galaxy-tool-util-ts/tree/main/packages/cli

## Load Upfront

- `references/notes/component-cwl-workflow-anatomy.md`: Research note copied verbatim into the bundle. Preserve the lightweight CWL boundary and avoid re-inferring structure already present in the summary.
- `references/notes/galaxy-data-flow-draft-contract.md`: Research note copied verbatim into the bundle. Respect the handoff from abstract data-flow draft to gxformat2 skeleton. Use when: translating abstract nodes, unresolved tool needs, and placeholder transformations into template TODOs.
- `references/notes/galaxy-workflow-draft-format.md`: Research note copied verbatim into the bundle. Emit the gxformat2 draft superset: TODO tool_id, optional tool_state / tool_shed_repository, and per-step _plan_state / _plan_context planning fields.
- `references/notes/gxformat2-schema.md`: Research note copied verbatim into the bundle. Use the gxformat2 structural vocabulary for workflow inputs, outputs, steps, and placeholder wiring.
- `references/schemas/summary-cwl.schema.json`: Schema file copied verbatim into the bundle. Read CWL source graph, step ids, command surfaces, scatter, conditionals, requirements, and warnings while emitting placeholder steps.
- `references/schemas/galaxy-workflow-draft.schema.json`: Schema file copied verbatim into the bundle. Output contract: the emitted gxformat2 draft conforms to galaxy-workflow-draft. Cast bundles the JSON Schema so the skill carries its output shape alongside the draft-validate CLI checks.

## Load On Demand

- `references/cli/draft-validate.json`: CLI command reference packaged as a sidecar. Validate the emitted draft against draft-contract rules (sentinel form, topology, _plan_* placement) before handing off. Use when: after writing or modifying the draft workflow file.
- `references/patterns/galaxy-collection-patterns.md`: Pattern note copied verbatim into the bundle. Use corpus-grounded collection pattern guidance for unresolved skeleton steps. Use when: adding TODO steps for collection cleanup, reshaping, relabeling, identifier synchronization, or collection-tabular bridges.
- `references/patterns/galaxy-conditionals-patterns.md`: Pattern note copied verbatim into the bundle. Use corpus-grounded conditional pattern guidance for unresolved skeleton steps. Use when: adding TODO steps for optional steps, gating on non-empty results, routing between alternative outputs, or transform-or-pass-through branches.
- `references/patterns/galaxy-interval-patterns.md`: Pattern note copied verbatim into the bundle. Use corpus-grounded genomic-interval pattern guidance for unresolved skeleton steps. Use when: adding TODO steps for interval overlap, merge, coverage, windowing, masking, or set-algebra on coordinate features.
- `references/patterns/galaxy-tabular-patterns.md`: Pattern note copied verbatim into the bundle. Use corpus-grounded tabular pattern guidance for unresolved skeleton steps. Use when: adding TODO steps for tabular filtering, projection, joins, aggregation, text-processing recipes, or tabular-collection bridges.
- `references/notes/galaxy-collection-semantics.md`: Research note copied verbatim into the bundle. Translate CWL arrays, records, scatter, and secondary-file shapes into Galaxy collection typing and map-over/reduction semantics. Use when: creating workflow inputs, outputs, and placeholder connections involving collections.
- `references/notes/galaxy-collection-semantics.upstream.myst`: Companion file copied verbatim into the bundle. Sibling of `references/notes/galaxy-collection-semantics.md`; read it where that note directs.
- `references/notes/galaxy-collection-semantics.yml`: Companion file copied verbatim into the bundle. Sibling of `references/notes/galaxy-collection-semantics.md`; read it where that note directs.
- `references/notes/galaxy-workflow-comments.md`: Research note copied verbatim into the bundle. Group the settled step set into titled stage frames (the gxformat2 `comments:` array) so the skeleton carries the analysis-stage narrative IWC authors annotate by hand. Schema-legal and optional. Use when: after topology is settled and the skeleton can be partitioned into named analysis stages (inputs, per-stage step clusters, parameter-derivation knots, visualization/outputs).
- `references/notes/galaxy-workflow-testability-design.md`: Research note copied verbatim into the bundle. Choose stable workflow input/output labels, testable checkpoint outputs, and fixture-compatible workflow interfaces while drafting the skeleton. Use when: the template decides workflow inputs, workflow outputs, promoted checkpoints, or collection output identifiers that future tests will need to address.

## Validation

- Validate `galaxy-workflow-draft.gxwf.yml` for artifact `galaxy-workflow-draft` against the galaxy-workflow-draft schema when a validator is available.

## Procedure

Read the original CWL source artifact, the CWL summary, the CWL-to-Galaxy interface brief, and the CWL-to-Galaxy data-flow brief. Emit a gxformat2 skeleton with workflow inputs, workflow outputs, placeholder steps, rough connections, and TODO slots for later implementation skills.

CWL already carries structured workflow shape, so this skill should be lighter than nextflow-summary-to-galaxy-template. Treat the prior-step index as the working context: CWL source, CWL summary, interface brief, data-flow brief, and any open questions carried forward.

Topology is this skill's job to settle. The output must be concrete gxformat2: workflow inputs with their final collection shapes and formats, workflow outputs, the step set, the producer→consumer edge graph, branches, and `when:` guards are all decided here. The upstream interface and data-flow briefs guide those decisions, but if they hedge or leave a topology choice open, this skill makes the call from source evidence, IWC exemplars, and pattern pages — never emit a topology `TODO`. Wrapper resolution, by contrast, is **evidence-gated, not source-gated**: resolve each tool step to the tier its evidence supports — **Resolved** (fully concrete, no `_plan_*`), **Identity-pinned** (concrete `tool_id`, parameters and changeset left to the per-step skill), or **Deferred** (`tool_id: TODO`) — as defined in galaxy-workflow-draft-format. Capture whatever you defer in the `_plan_*` family (`_plan_state`, `_plan_context`, `_plan_in`, `_plan_out`) so the per-step skill has the source evidence and constraints it needs.

Source tendency: a CWL `CommandLineTool` carries `baseCommand` / `arguments`, `DockerRequirement` / `SoftwareRequirement` hints, and explicit input/output bindings — so identity is often inferable to **Identity-pinned**, and a step reaches **Resolved** when a pattern page or IWC exemplar covers the operation (fill `tool_id`, parameters, and port names from the worked example). A custom-script tool with no Galaxy equivalent stays **Deferred** — pack `_plan_context` with the `baseCommand` / `arguments`, `DockerRequirement` URIs, `SoftwareRequirement` packages, and `EnvVarRequirement` / `ResourceRequirement` constraints the per-step skill needs to pick a wrapper. Emitting `TODO` over a pattern-covered recipe discards real evidence the per-step skill cannot recover.

Optionally, once topology is settled, group the step set into titled stage frames via the gxformat2 `comments:` array (one frame per analysis stage, `contains_steps:` populated, color decorative) — see galaxy-workflow-comments for the convention.

Output shape is gxformat2 with wrapper-tier relaxations and `_plan_state` / `_plan_context` / `_plan_in` / `_plan_out` per tool step — see galaxy-workflow-draft-format. Refinement open work for those planning fields lives in `refinement.md`.

Use CWL step ids as the first pass for placeholder labels, then revise labels only when the interface/data-flow briefs or IWC comparison notes give a clearer Galaxy convention. Preserve one placeholder per logical CWL step unless the data-flow brief explicitly asks to split an expression, nested workflow, or collection operation into Galaxy-native steps.

## Runtime Notes

- Do not read Foundry source files at runtime; use only files packaged in this skill bundle and user-supplied artifacts.
- Preserve declared artifact filenames unless the user or harness supplies explicit paths.
- Carry unresolved assumptions into the output artifact instead of silently inventing missing source evidence.
