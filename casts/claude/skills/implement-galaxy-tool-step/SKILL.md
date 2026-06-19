---
name: implement-galaxy-tool-step
description: "Convert an abstract step into a concrete gxformat2 step using a tool summary."
---

# implement-galaxy-tool-step

Follow the procedure below and use the artifact/reference sections as the runtime contract.

## When To Use

- Convert an abstract step into a concrete gxformat2 step using a tool summary.

## Inputs

- Read artifact `galaxy-tool-summary`. Schema: galaxy-tool-summary. Produced by `summarize-galaxy-tool`. Galaxy tool summary manifest from summarize-galaxy-tool conforming to galaxy-tool-summary; binds the abstract step to a concrete tool's ports via the embedded `parsed_tool` and generated `input_schemas`.
- Read artifact `galaxy-workflow-draft`. Schema: galaxy-workflow-draft. Produced by `advance-galaxy-draft-step`, `cwl-summary-to-galaxy-template`, `freeform-summary-to-galaxy-template`, `implement-galaxy-tool-step`, `nextflow-summary-to-galaxy-template`, `repair-galaxy-draft-topology`. gxformat2 skeleton being filled in step by step; the step replaces a placeholder in this draft.
- Read artifact `open-requirements-ledger`. Produced by `advance-galaxy-draft-step`, `compare-against-iwc-exemplar`, `cwl-summary-to-galaxy-data-flow`, `cwl-summary-to-galaxy-interface`, `cwl-summary-to-galaxy-template`, `freeform-summary-to-galaxy-data-flow`, `freeform-summary-to-galaxy-interface`, `freeform-summary-to-galaxy-template`, `implement-galaxy-tool-step`, `nextflow-summary-to-galaxy-data-flow`, `nextflow-summary-to-galaxy-interface`, `nextflow-summary-to-galaxy-reference-data`, `nextflow-summary-to-galaxy-template`, `repair-galaxy-draft-topology`. Carried obligations ledger open-requirements-ledger: read entries the design tier recorded against this step before implementing; append a blocking entry if its output can't be computed.

## Outputs

- Write artifact `galaxy-workflow-draft` as `galaxy-workflow-draft.gxwf.yml`. Format: `yaml`. Schema: galaxy-workflow-draft. gxformat2 skeleton with one more abstract step replaced by a concrete tool step (loop iteration output).
- Write artifact `open-requirements-ledger` as `open-requirements.ledger.yml`. Format: `yaml`. Ledger (open-requirements-ledger) with a blocking entry appended when a step's declared output can't be computed from its wired inputs; drives the fall-through to topology repair.

## Required Tools

- **`gxwf`** (gxwf). `npm install -g @galaxy-tool-util/cli@^1.8.1`.
  Ephemeral run: `npx --yes --package @galaxy-tool-util/cli@1.8.1 gxwf`.
  Check: `gxwf --help | grep -q draft-validate`.
  Docs: https://github.com/jmchilton/galaxy-tool-util-ts/tree/main/packages/cli

## Load Upfront

- `references/notes/open-requirements-ledger.md`: Research note copied verbatim into the bundle. Carry the open-requirements ledger: read open entries bearing on this step's decisions, mark resolved the ones it closes, and append any new unmet need it surfaces.
- `references/schemas/galaxy-tool-summary.schema.json`: Schema file copied verbatim into the bundle. Bind the abstract step against the deterministic tool summary manifest emitted upstream — read `parsed_tool` for ports/datatypes and `input_schemas.workflow_step_linked` for valid step `tool_state` shape.
- `references/schemas/galaxy-workflow-draft.schema.json`: Schema file copied verbatim into the bundle. In/out contract: the draft this Mold reads and mutates in place conforms to galaxy-workflow-draft. Cast bundles the JSON Schema alongside the draft-validate CLI checks.

## Load On Demand

- `references/cli/draft-validate.json`: CLI command reference packaged as a sidecar. Validate the mutated draft against draft-contract rules; with --concrete, also gate the extracted concrete subset (including the step just implemented) against full gxformat2. Use when: after implementing or modifying a concrete tool step in the draft.
- `references/notes/galaxy-apply-rules-dsl.md`: Research note copied verbatim into the bundle. Implement identifier-derived collection reshaping via Apply Rules. Use when: collection element identifiers need regex parsing, nesting-level swaps, regrouping, or paired identifier assignment.
- `references/notes/galaxy-collection-semantics.md`: Research note copied verbatim into the bundle. Connect concrete Galaxy tool inputs/outputs while preserving collection mapping and reduction semantics. Use when: implementing a step with data_collection inputs, mapped outputs, reductions, or nested collection wiring.
- `references/notes/galaxy-collection-semantics.upstream.myst`: Companion file copied verbatim into the bundle. Sibling of `references/notes/galaxy-collection-semantics.md`; read it where that note directs.
- `references/notes/galaxy-collection-semantics.yml`: Companion file copied verbatim into the bundle. Sibling of `references/notes/galaxy-collection-semantics.md`; read it where that note directs.
- `references/notes/galaxy-collection-tools.md`: Research note copied verbatim into the bundle. Insert built-in Galaxy collection-operation steps when a direct tool connection cannot express the needed shape. Use when: a step needs collection construction, filtering, extraction, zipping, unzipping, flattening, merging, or relabeling.
- `references/notes/galaxy-tool-job-failure-reference.md`: Research note copied verbatim into the bundle. Preserve concrete tool/job failure evidence while implementing step labels, tool ids, output labels, and collection wiring. Use when: a selected wrapper has explicit failure semantics, dynamic outputs, non-default stdio rules, strict-shell behavior, or runtime-only failure risk.
- `references/notes/galaxy-workflow-testability-design.md`: Research note copied verbatim into the bundle. Preserve testable output labels and collection element identifiers while replacing abstract steps with concrete gxformat2 steps. Use when: a concrete step changes output labels, emits collection outputs, creates a diagnostic checkpoint, or makes a final output too weakly assertable.
- `references/notes/nextflow-operators-to-galaxy-collection-recipes.md`: Research note copied verbatim into the bundle. Turn operator-derived abstract transforms into concrete Galaxy wiring, collection operations, or review requests. Use when: a concrete step implements behavior traced to map, join, groupTuple, branch, mix, combine, or multiMap.
- `references/notes/nextflow-to-galaxy-channel-shape-mapping.md`: Research note copied verbatim into the bundle. Check whether a concrete tool input/output can preserve the intended source-derived Galaxy collection shape. Use when: implementing concrete steps for source-derived File/list/paired/list:paired/list:list inputs or outputs.

## Validation

- Validate `galaxy-workflow-draft.gxwf.yml` for artifact `galaxy-workflow-draft` against the galaxy-workflow-draft schema when a validator is available.

## Procedure

Replace one abstract step in the gxformat2 draft with a concrete tool step, using the upstream tool summary. One invocation resolves exactly the chosen step's `TODO_*` / `_plan_*` slots into a concrete `tool_id`, `tool_version`, `tool_state`, and wrapper-determined port names, and returns the mutated draft. This is the "Implement" leaf of the per-step loop owned by advance-galaxy-draft-step.

Single step in scope. This skill owns the chosen step and the wiring that connects it to ports already in the draft. It does not redesign topology and does not unwind earlier iterations — cross-step rework is the orchestrator's call.

### Sequence

1. **Read the step's plan.** From the galaxy-workflow-draft, take the chosen step's deferred evidence: `_plan_state`, `_plan_context`, `_plan_in`, `_plan_out`, and any `TODO_*` slots the template or data-flow brief left for this phase.
2. **Bind to the tool summary.** Read the galaxy-tool-summary manifest: `parsed_tool` gives concrete input/output port names and datatypes; shape the step's `tool_state` against `input_schemas.workflow_step_linked`. Set `tool_version`, and set `tool_id` — confirming or correcting an identity-pinned id rather than re-deriving a good pin from scratch. For a built-in/stock tool the `tool_id` is the bare id (`Filter1`, `Cut1`, collection ops) and `tool_version` must come from the summary's cached pin — never invent a stock version; the summary already resolved it against the shed via summarize-galaxy-tool. If `input_schemas` is `null`, consult `warnings[]` for why before binding by hand.
3. **Wire ports.** Connect the step's inputs to their upstream producers and its outputs to downstream consumers per the `_plan_in` / `_plan_out` intent, using real wrapper port names. Preserve collection mapping and reduction semantics (galaxy-collection-semantics); for a source-derived shape, check the chosen input/output can actually carry the intended File / list / paired / list:paired shape (nextflow-to-galaxy-channel-shape-mapping).
4. **Close shape gaps.** When a direct tool connection cannot express the needed shape, insert a built-in collection-operation step (galaxy-collection-tools); for identifier-derived reshaping — regex parsing, nesting swaps, paired assignment — use Apply Rules (galaxy-apply-rules-dsl); for a transform traced to a Nextflow operator (map, join, groupTuple, branch, mix, combine, multiMap), turn it into concrete wiring or a review request via nextflow-operators-to-galaxy-collection-recipes. A built-in step inserted here is itself a stock tool: resolve its concrete `tool_version` through the galaxy-tool-cache flow (summarize-galaxy-tool on the bare id) rather than guessing — or leave it draft-tier for the next loop iteration to realize.
5. **Preserve testability.** Keep output labels and collection element identifiers stable and addressable (galaxy-workflow-testability-design). Do not rename a labeled output, drop a checkpoint, or make a final output too weakly assertable just to satisfy this step's wiring.
6. **Validate.** Run draft-validate `--concrete` over the mutated draft: it checks draft-contract rules and gates the extracted concrete subset — including the step just implemented — against full gxformat2. On green, return the draft for the next loop iteration; on red, route the diagnostic back to whichever decision above it implicates.

### Failure ownership

When the wrapper can't cleanly carry what the plan needs — wrong datatype, missing parameter, unsupported collection shape — record where a later failure should be investigated: tool/job failure, data-flow mistake, template wiring mistake, wrapper mismatch, or test/assertion issue. Consult galaxy-tool-job-failure-reference when the selected wrapper has explicit failure semantics (exit-code rules, stdio regex, strict-shell, dynamic outputs); implement the step's labels and wiring so that evidence survives to runtime rather than being erased by the concretization.

When the step's declared output cannot be computed from the inputs wired to it — the connection graph says the ports connect, but no wired input carries the evidence the output needs — do not fabricate it. Append a blocking entry to the open-requirements-ledger naming the step, the uncomputable output, and the missing evidence, and fall through to repair-galaxy-draft-topology rather than emitting a step that validates but can't run. A missing Tool Shed wrapper is not this case; that gap routes through the discover-or-author branch.

## Runtime Notes

- Do not read Foundry source files at runtime; use only files packaged in this skill bundle and user-supplied artifacts.
- Preserve declared artifact filenames unless the user or harness supplies explicit paths.
- Carry unresolved assumptions into the output artifact instead of silently inventing missing source evidence.
