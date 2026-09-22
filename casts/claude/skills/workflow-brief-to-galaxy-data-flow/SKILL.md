---
name: workflow-brief-to-galaxy-data-flow
description: "Translate a reviewed Workflow Brief and its Galaxy interface into a Galaxy data-flow design brief."
---

# workflow-brief-to-galaxy-data-flow

Follow the procedure below and use the artifact/reference sections as the runtime contract.

## When To Use

- Translate a reviewed Workflow Brief and its Galaxy interface into a Galaxy data-flow design brief.

## Inputs

- Read artifact `workflow-brief`. Schema: workflow-brief-schema. Produced by `freeform-summary-to-workflow-brief`, `nextflow-summary-to-workflow-brief`. Expert-reviewed implementation contract governing scientific scope, requirements, and acceptance criteria.
- Read artifact `freeform-summary`. Optional; absence is allowed and must be reported honestly. Produced by `interview-to-freeform-summary`, `summarize-paper`. Optional narrative source evidence retained from brief production; consult it for details within the selected scope.
- Read artifact `summary-nextflow`. Optional; absence is allowed and must be reported honestly. Schema: summary-nextflow. Produced by `summarize-nextflow`. Optional structured Nextflow source evidence; consult it without treating source implementation as Galaxy design.
- Read artifact `workflow-brief-galaxy-interface`. Produced by `workflow-brief-to-galaxy-interface`. Preceding Galaxy interface brief from workflow-brief-to-galaxy-interface that pins inputs, outputs, and labels.
- Read artifact `open-requirements-ledger`. Produced by `advance-galaxy-draft-step`, `apply-galaxy-workflow-changeset`, `compare-against-iwc-exemplar`, `cwl-summary-to-galaxy-data-flow`, `cwl-summary-to-galaxy-interface`, `cwl-summary-to-galaxy-template`, `implement-galaxy-tool-step`, `interview-to-galaxy-workflow-changeset`, `mature-galaxy-workflow-for-iwc`, `nextflow-summary-to-galaxy-data-flow`, `nextflow-summary-to-galaxy-interface`, `nextflow-summary-to-galaxy-reference-data`, `nextflow-summary-to-galaxy-template`, `repair-galaxy-draft-topology`, `workflow-brief-to-galaxy-data-flow`, `workflow-brief-to-galaxy-interface`, `workflow-brief-to-galaxy-template`. Carried workflow-run knowledge open-requirements-ledger initialized by the interface Mold.

## Outputs

- Write artifact `workflow-brief-galaxy-data-flow` as `workflow-brief-galaxy-data-flow.md`. Format: `markdown`. Reviewable Markdown brief: abstract operations, collection map/reduce choices, shape-changing placeholder steps, unresolved Galaxy tool needs, confidence, open questions.
- Write artifact `open-requirements-ledger` as `open-requirements.ledger.yml`. Format: `yaml`. Carried obligations ledger re-emitted by this step: entries it appended or closed updated, every other entry passed through with its provenance intact.

## Required Tools

- None declared. Procedure should not assume external CLIs are present.

## Load Upfront

- `references/notes/galaxy-data-flow-draft-contract.md`: Research note copied verbatim into the bundle. Keep the data-flow brief separate from gxformat2 templating and concrete step implementation.
- `references/notes/open-requirements-ledger.md`: Research note copied verbatim into the bundle. Inherit open entries rather than re-deriving them, close the ones this brief's wiring and collection decisions settle, and append data-flow obligations the narrative leaves open — a described transformation with no named tool, an implied intermediate the source never states, an ordering the prose doesn't fix.
- `references/notes/workflow-brief-design.md`: Research note copied verbatim into the bundle. Keep reviewed intent authoritative while using source summaries only as supporting evidence.
- `references/schemas/workflow-brief-schema.schema.json`: Schema file copied verbatim into the bundle. Carry the required implementation-contract shape into this design step.

## Load On Demand

- `references/patterns/galaxy-collection-patterns.md`: Pattern note copied verbatim into the bundle. Ground collection-shape choices in curated, corpus-observed operation and recipe patterns. Use when: selecting collection cleanup, reshape, identifier, or collection-tabular bridge patterns.
- `references/patterns/galaxy-conditionals-patterns.md`: Pattern note copied verbatim into the bundle. Ground conditional-branch and optional-step choices in curated, corpus-observed Galaxy when/pick_value patterns. Use when: data-flow translation needs optional steps, gating on non-empty results, routing between alternative outputs, or transform-or-pass-through branches.
- `references/patterns/galaxy-interval-patterns.md`: Pattern note copied verbatim into the bundle. Ground genomic-interval operation choices in curated, corpus-observed Galaxy interval recipes. Use when: the workflow operates on genomic intervals (BED/GFF/VCF coordinate features) and data-flow translation needs overlap, merge, coverage, windowing, masking, or set-algebra steps.
- `references/patterns/galaxy-tabular-patterns.md`: Pattern note copied verbatim into the bundle. Ground tabular bridge and table-operation choices in curated, corpus-observed operation patterns. Use when: data-flow translation needs filtering, joining, aggregation, pivoting, or tabular-collection bridges.
- `references/notes/galaxy-sample-sheet-collections.md`: Research note copied verbatim into the bundle. Preserve per-row metadata on the data-flow side: keep sample_sheet column_definitions wired through identifier-keyed steps instead of dropping into parallel parameter inputs, and re-attach metadata after map-over steps that lose it. Use when: the interface brief carries a sample_sheet[:paired|:paired_or_unpaired|:record] input, or supporting evidence describes per-sample/per-record metadata that must survive map-over steps.

## Validation

- None declared.

## Procedure

Read the reviewed Workflow Brief plus the preceding Galaxy interface brief and emit a reviewable Markdown data-flow brief. Consult retained source evidence when available. Capture abstract operations, collection map/reduce choices, shape-changing placeholder transformations, unresolved Galaxy tool needs, confidence, and open questions.

The Workflow Brief governs scope and requirements. A `freeform-summary` or `summary-nextflow` can substantiate details within that scope but cannot broaden it or turn source implementation into assumed Galaxy wiring. Translate what the brief, interface, and evidence support; classify the rest as unresolved tool needs or ledger obligations. If correct implementation requires changing reviewed intent, propose a brief change and stop rather than silently applying it.

The output is not gxformat2 and should not resolve exact Tool Shed tools. workflow-brief-to-galaxy-template turns this handoff and the interface brief into a skeleton.

## Feedback Mode

- Feedback mode is off unless the caller explicitly enables `--feedback` or supplies a feedback-ledger path.
- When enabled, read `_feedback.md` before doing the work and use its registered `foundry-feedback.ledger.yml` protocol.
- Preserve harness-owned run and phase state. Append only concrete observations about a canonical Foundry source asset or a related project that this run showed to be at fault; do not put ordinary workflow requirements in this ledger.
- Before reporting completion, make one explicit pass over the work you just did. Do not ask yourself whether anything was unclear — recall what happened: where you guessed at something the instructions should have settled, needed information this bundle does not carry, hit an instruction that contradicted another or contradicted the artifacts in front of you, used a packaged reference that did not cover your case, or did something the procedure never describes.
- Append an entry for each such event that clears the protocol's bar. If none do, append nothing and report `no feedback` explicitly. Silence and a clean pass are not the same thing, and nothing downstream can tell them apart unless you say which one it was.
- Pass the same ledger path to any subagent used for this work, and merge updates serially so one writer cannot overwrite another.

## Runtime Notes

- Do not read Foundry source files at runtime; use only files packaged in this skill bundle and user-supplied artifacts.
- Preserve declared artifact filenames unless the user or harness supplies explicit paths.
- Carry unresolved assumptions into the output artifact instead of silently inventing missing source evidence.
