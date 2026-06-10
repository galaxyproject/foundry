---
name: freeform-summary-to-galaxy-template
description: "gxformat2 skeleton with per-step TODOs from a free-form summary and Galaxy design brief."
---

# freeform-summary-to-galaxy-template

Follow the procedure below and use the artifact/reference sections as the runtime contract.

## When To Use

- gxformat2 skeleton with per-step TODOs from a free-form summary and Galaxy design brief.

## Inputs

- Read artifact `freeform-summary`. Produced by `interview-to-freeform-summary`, `summarize-paper`. Free-form source summary emitted by summarize-paper or interview-to-freeform-summary; consulted while emitting placeholder steps.
- Read artifact `freeform-galaxy-interface`. Produced by `freeform-summary-to-galaxy-interface`. Galaxy interface brief from freeform-summary-to-galaxy-interface that pins workflow inputs, outputs, labels.
- Read artifact `freeform-galaxy-data-flow`. Produced by `freeform-summary-to-galaxy-data-flow`. Galaxy data-flow brief from freeform-summary-to-galaxy-data-flow that pins abstract operations and collection choices.
- Read artifact `iwc-comparison-notes`. Produced by `compare-against-iwc-exemplar`. Structural diff guidance from compare-against-iwc-exemplar (run on the design brief); steers the skeleton toward IWC-aligned structure before per-step authoring.

## Outputs

- Write artifact `galaxy-workflow-draft` as `galaxy-workflow-draft.gxwf.yml`. Format: `yaml`. Schema: galaxy-workflow-draft. gxformat2 draft (see galaxy-workflow-draft-format): topology fully resolved (workflow inputs, outputs, step set, edges); tool_id / tool_state / tool_shed_repository and wrapper-determined port names may be TODO with free-text _plan_state / _plan_context / _plan_in / _plan_out per step for later implementation Molds.

## Required Tools

- **`gxwf`** (gxwf). `npm install -g @galaxy-tool-util/cli`.
  Ephemeral run: `npx --package @galaxy-tool-util/cli gxwf`.
  Check: `gxwf --version`.
  Docs: https://github.com/jmchilton/galaxy-tool-util-ts/tree/main/packages/cli

## Load Upfront

- `references/notes/galaxy-data-flow-draft-contract.md`: Research note copied verbatim into the bundle. Respect the handoff from the freeform-to-Galaxy interface and data-flow briefs to the gxformat2 skeleton. Use when: translating abstract nodes, unresolved tool needs, and placeholder transformations into template TODOs.
- `references/notes/galaxy-workflow-draft-format.md`: Research note copied verbatim into the bundle. Emit the gxformat2 draft superset: TODO tool_id, optional tool_state / tool_shed_repository, and per-step _plan_state / _plan_context planning fields.
- `references/schemas/galaxy-workflow-draft.schema.json`: Schema file copied verbatim into the bundle. Output contract: the emitted gxformat2 draft conforms to galaxy-workflow-draft. Cast bundles the JSON Schema so the skill carries its output shape alongside the draft-validate CLI checks.

## Load On Demand

- `references/cli/draft-validate.json`: CLI command reference packaged as a sidecar. Validate the emitted draft against draft-contract rules (sentinel form, topology, _plan_* placement) before handing off. Use when: after writing or modifying the draft workflow file.
- `references/patterns/galaxy-collection-patterns.md`: Pattern note copied verbatim into the bundle. Use corpus-grounded collection pattern guidance for unresolved skeleton steps. Use when: adding TODO steps for collection cleanup, reshaping, relabeling, identifier synchronization, or collection-tabular bridges.
- `references/patterns/galaxy-tabular-patterns.md`: Pattern note copied verbatim into the bundle. Use corpus-grounded tabular pattern guidance for unresolved skeleton steps. Use when: adding TODO steps for tabular filtering, projection, joins, aggregation, text-processing recipes, or tabular-collection bridges.
- `references/notes/galaxy-collection-semantics.md`: Research note copied verbatim into the bundle. Preserve Galaxy collection typing and map-over/reduction semantics in the gxformat2 skeleton. Use when: creating workflow inputs, outputs, and placeholder connections involving collections.
- `references/notes/galaxy-workflow-testability-design.md`: Research note copied verbatim into the bundle. Choose stable workflow input/output labels, testable checkpoint outputs, and fixture-compatible workflow interfaces while drafting the skeleton. Use when: the template decides workflow inputs, workflow outputs, promoted checkpoints, or collection output identifiers that future tests will need to address.

## Validation

- Validate `galaxy-workflow-draft.gxwf.yml` for artifact `galaxy-workflow-draft` against the galaxy-workflow-draft schema when a validator is available.

## Procedure

Read the original free-form source artifact if present, the free-form summary Markdown document, and the freeform-to-Galaxy interface and data-flow briefs. Emit a gxformat2 skeleton with workflow inputs, workflow outputs, placeholder steps, rough connections, and TODO slots for later implementation skills.

The free-form summary does not have a concrete schema yet; treat it as Markdown. Treat the prior-step index as the working context: source transcript or paper, free-form summary, freeform-to-Galaxy interface and data-flow briefs, and any open questions carried forward.

Topology is this skill's job to settle. The output must be concrete gxformat2: workflow inputs with their final collection shapes and formats, workflow outputs, the step set, the producer→consumer edge graph, branches, and `when:` guards are all decided here. The upstream freeform-to-Galaxy interface and data-flow briefs guide those decisions, but if they hedge or leave a topology choice open, this skill makes the call from source evidence, IWC exemplars, and pattern pages — never emit a topology `TODO`. What is deferred to per-step authoring is strictly wrapper-tier: `tool_id`, `tool_version`, `tool_shed_repository`, `tool_state`, and the wrapper-determined port names that surface in `in:` / `out:` / `outputSource`. Capture deferred intent in the `_plan_*` family (`_plan_state`, `_plan_context`, `_plan_in`, `_plan_out`) so the per-step skill has the source evidence and constraints it needs.

Defer thoughtfully. When research surfaces a Foundry pattern page that names the exact recipe — a galaxy-collection-patterns reshape, a conditional-run-optional-step gate, a galaxy-tabular-patterns filter — fill the step in as completely as the pattern allows: concrete `tool_id`, parameters, port names from the pattern's worked example. Pattern pages encode resolved choices; emitting `TODO` over a covered recipe discards real evidence the per-step skill cannot recover. Free-form sources will rarely give you enough to fill a domain tool step concretely — defer those wrappers and parameters, but cite the originating paper section, interview answer, figure, or supplementary table in `_plan_context` and use `_plan_state` to record vague intent ("default settings", "stranded reverse if mentioned, else unstranded") so the per-step skill knows the evidence ceiling.

Output shape is gxformat2 with wrapper-tier relaxations and `_plan_state` / `_plan_context` / `_plan_in` / `_plan_out` per tool step — see galaxy-workflow-draft-format. Refinement open work for those planning fields lives in `refinement.md`.

## Runtime Notes

- Do not read Foundry source files at runtime; use only files packaged in this skill bundle and user-supplied artifacts.
- Preserve declared artifact filenames unless the user or harness supplies explicit paths.
- Carry unresolved assumptions into the output artifact instead of silently inventing missing source evidence.
