---
name: workflow-brief-to-galaxy-interface
description: "Map a reviewed Workflow Brief into a Galaxy workflow interface design brief, consulting retained source evidence when available."
---

# workflow-brief-to-galaxy-interface

Follow the procedure below and use the artifact/reference sections as the runtime contract.

## When To Use

- Map a reviewed Workflow Brief into a Galaxy workflow interface design brief, consulting retained source evidence when available.

## Inputs

- Read artifact `workflow-brief`. Schema: workflow-brief-schema. Produced by `freeform-summary-to-workflow-brief`, `nextflow-summary-to-workflow-brief`. Expert-reviewed implementation contract. Its objective, scope, requirements, acceptance criteria, and exclusions govern every interface decision.
- Read artifact `freeform-summary`. Optional; absence is allowed and must be reported honestly. Produced by `interview-to-freeform-summary`, `summarize-paper`. Optional narrative source evidence; it may clarify the selected scope but cannot broaden or override the brief.
- Read artifact `summary-nextflow`. Optional; absence is allowed and must be reported honestly. Schema: summary-nextflow. Produced by `summarize-nextflow`. Optional structured Nextflow source evidence; process, channel, parameter, and test facts are evidence rather than assumed Galaxy design.
- Read artifact `open-requirements-ledger`. Optional; absence is allowed and must be reported honestly. Produced by `advance-galaxy-draft-step`, `apply-galaxy-workflow-changeset`, `compare-against-iwc-exemplar`, `cwl-summary-to-galaxy-data-flow`, `cwl-summary-to-galaxy-interface`, `cwl-summary-to-galaxy-template`, `freeform-summary-to-galaxy-data-flow`, `freeform-summary-to-galaxy-interface`, `freeform-summary-to-galaxy-template`, `implement-galaxy-tool-step`, `interview-to-galaxy-workflow-changeset`, `mature-galaxy-workflow-for-iwc`, `nextflow-summary-to-galaxy-data-flow`, `nextflow-summary-to-galaxy-interface`, `nextflow-summary-to-galaxy-reference-data`, `nextflow-summary-to-galaxy-template`, `repair-galaxy-draft-topology`, `workflow-brief-to-galaxy-data-flow`, `workflow-brief-to-galaxy-interface`, `workflow-brief-to-galaxy-template`. Carried workflow-run knowledge open-requirements-ledger. Absent on the first design Mold of a run; initialize an empty ledger.

## Outputs

- Write artifact `workflow-brief-galaxy-interface` as `workflow-brief-galaxy-interface.md`. Format: `markdown`. Reviewable Markdown brief: Galaxy workflow inputs, outputs, labels, collection shapes, checkpoint outputs, Workflow Brief provenance, supporting-evidence citations, confidence, and open questions.
- Write artifact `open-requirements-ledger` as `open-requirements.ledger.yml`. Format: `yaml`. Carried obligations ledger re-emitted by this step: entries it appended or closed updated, every other entry passed through with its provenance intact.

## Required Tools

- None declared. Procedure should not assume external CLIs are present.

## Load Upfront

- `references/notes/open-requirements-ledger.md`: Research note copied verbatim into the bundle. Inherit open entries rather than re-deriving them, close the ones this brief's input, output, and label decisions settle, and append interface obligations the narrative never settles — an output the source names but never specifies, a parameter stated only qualitatively, a collection shape the prose doesn't determine.
- `references/notes/workflow-brief-design.md`: Research note copied verbatim into the bundle. Preserve the authority boundary between reviewed intent, optional source evidence, and downstream Galaxy design decisions.
- `references/schemas/workflow-brief-schema.schema.json`: Schema file copied verbatim into the bundle. Validate the required Workflow Brief before treating it as the implementation contract.

## Load On Demand

- `references/notes/galaxy-collection-semantics.md`: Research note copied verbatim into the bundle. Choose Galaxy collection input shapes (File / list / paired / list:paired / record) from the source's per-sample, paired, grouped, or nested data descriptions. Use when: the brief or supporting evidence describes paired reads, per-sample groups, nested or grouped inputs, or any input that should become a Galaxy dataset collection.
- `references/notes/galaxy-collection-semantics.yml`: Companion file copied verbatim into the bundle. Sibling of `references/notes/galaxy-collection-semantics.md`; read it where that note directs.
- `references/notes/galaxy-sample-sheet-collections.md`: Research note copied verbatim into the bundle. Pick the right sample_sheet variant and translate described per-sample column metadata into Galaxy column_definitions when the source describes sample-sheet-shaped inputs. Use when: the brief or supporting evidence describes a sample sheet, a per-sample/per-record table, or any table mapping samples to files that should become a Galaxy collection or sample-sheet input.
- `references/notes/galaxy-workflow-testability-design.md`: Research note copied verbatim into the bundle. Choose stable workflow input/output labels and promoted checkpoint outputs that future tests can address. Use when: deciding labels, public outputs, checkpoint outputs, or fixture-compatible collection inputs.

## Validation

- None declared.

## Procedure

Read the reviewed, unchanged Workflow Brief and emit a reviewable Markdown interface brief for a Galaxy workflow. Capture workflow inputs, workflow outputs, labels, Galaxy collection shapes, checkpoint outputs worth exposing for tests, provenance, confidence, and open questions.

The Workflow Brief is authoritative for objective, included and excluded scope, expert requirements, and acceptance criteria. Consult a retained `freeform-summary` or `summary-nextflow` only as supporting evidence for the selected work. Evidence may supply methods, formats, parameters, datasets, or uncertainty that the concise brief omits, but it cannot silently add analyses or override an expert decision. A hand-authored brief with no source summary is valid.

Translate what the reviewed contract and available evidence support into Galaxy interface decisions. Record evidence as discoveries, authorized mappings as decisions, missing actionable detail as obligations, and any needed change to expert intent as a proposed brief-change recommendation in the ledger. Never edit the brief or apply a proposed change here.

The output is not a gxformat2 skeleton and not a workflow schema. It is a design handoff consumed by workflow-brief-to-galaxy-data-flow, workflow-brief-to-galaxy-template, and later test-plan work.

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
