---
name: freeform-summary-to-galaxy-test-plan
description: "Synthesize a Galaxy workflow test plan from a free-form summary and the Galaxy design briefs."
---

# freeform-summary-to-galaxy-test-plan

Follow the procedure below and use the artifact/reference sections as the runtime contract.

## When To Use

- Synthesize a Galaxy workflow test plan from a free-form summary and the Galaxy design briefs.

## Inputs

- Read artifact `freeform-summary`. Produced by `interview-to-freeform-summary`, `summarize-paper`. Free-form source summary from summarize-paper or interview-to-freeform-summary; carries methods, sample data, parameters, and expected outputs that seed test intent.
- Read artifact `freeform-galaxy-interface`. Produced by `freeform-summary-to-galaxy-interface`. Galaxy interface brief from freeform-summary-to-galaxy-interface that pins workflow inputs, outputs, and labels the plan binds assertions to.
- Read artifact `freeform-galaxy-data-flow`. Produced by `freeform-summary-to-galaxy-data-flow`. Galaxy data-flow brief from freeform-summary-to-galaxy-data-flow that pins abstract operations and collection choices the plan must respect.
- Read artifact `iwc-comparison-notes`. Produced by `compare-against-iwc-exemplar`. Structural diff guidance from compare-against-iwc-exemplar; steers the plan toward IWC-aligned testable checkpoints and fixture shapes.
- Read artifact `iwc-exemplar-gxformat2`. Produced by `compare-against-iwc-exemplar`. Cleaned gxformat2 view of the nearest IWC exemplar from compare-against-iwc-exemplar; pattern-match its labels, collection identifiers, and tested checkpoints. Absent when no nearest exemplar was found.

## Outputs

- Write artifact `galaxy-test-plan` as `galaxy-test-plan.yml`. Format: `yaml`. Schema: galaxy-workflow-test-plan. Reviewable Galaxy workflow test plan (see galaxy-workflow-test-plan): synthesized test cases with job inputs, expected outputs, assertion intent, fixture provenance, label assumptions, unresolved mappings, and omissions.

## Required Tools

- None declared. Procedure should not assume external CLIs are present.

## Load Upfront

- `references/schemas/galaxy-workflow-test-plan.schema.json`: Schema file copied verbatim into the bundle. Output contract: the emitted plan conforms to galaxy-workflow-test-plan. Cast bundles the JSON Schema so the skill carries its output shape; validate with `foundry validate-galaxy-workflow-test-plan`.

## Load On Demand

- `references/notes/galaxy-workflow-testability-design.md`: Research note copied verbatim into the bundle. Choose which workflow outputs and promoted checkpoints make meaningful assertions when no upstream test evidence exists. Use when: deciding which outputs to assert, which checkpoints to promote, and which labels the plan should assume.
- `references/notes/iwc-shortcuts-anti-patterns.md`: Research note copied verbatim into the bundle. Distinguish accepted IWC-style test shortcuts from assertion smells while synthesizing assertions from intent. Use when: considering existence-only, size-only, image-dimension, or tolerant output checks, or recording an omission.
- `references/notes/iwc-test-data-conventions.md`: Research note copied verbatim into the bundle. Describe job-input fixtures, remote-URL-first locations, hashes, and collection input shapes the plan should record as fixture provenance. Use when: recording job inputs or fixture provenance, or deciding whether a fixture belongs in test-data, Zenodo, ENA/SRA, or CVMFS.
- `references/notes/planemo-asserts-idioms.md`: Research note copied verbatim into the bundle. Pick the assertion family and tolerance that fit each synthesized expected output by output type. Use when: turning an expected output into assertion intent and a tolerance.
- `references/notes/planemo-workflow-test-architecture.md`: Research note copied verbatim into the bundle. Keep the plan addressable by stable labels and artifacts Planemo can connect back to invocations, jobs, and outputs. Use when: recording the labels and checkpoints the downstream test must address.
- `references/schemas/tests-format.schema.json`: Schema file copied verbatim into the bundle. Use the Galaxy workflow tests schema as the assertion-family vocabulary referenced by the plan's assertion intent. Use when: naming an assertion family or compare operator for a synthesized expected output.

## Validation

- Validate `galaxy-test-plan.yml` before returning it: run `foundry galaxy-test-plan.yml` from `@galaxy-foundry/foundry`. If the command is not on PATH, run `npx --package @galaxy-foundry/foundry foundry galaxy-test-plan.yml`. This checks artifact `galaxy-test-plan` against the galaxy-workflow-test-plan schema.

## Procedure

Synthesize a Galaxy workflow test plan from a free-form source summary and the Galaxy interface and data-flow briefs. The output is a reviewable handoff conforming to galaxy-workflow-test-plan, not a concrete `tests-format` file: it records test cases, job inputs, expected outputs, assertion intent, fixture provenance, label assumptions, unresolved mappings, and intentional omissions so implement-galaxy-workflow-test can author the final Galaxy test artifact.

### Synthesized, not translated

This is the structural difference from nextflow-test-to-galaxy-test-plan and cwl-test-to-galaxy-test-plan. Those skills **translate** existing upstream test evidence — nf-test snapshots, CWL job files and expected outputs — into a Galaxy plan. A free-form source has no upstream test fixtures to convert, so this skill **synthesizes** the plan from workflow intent and scenario-level expected outputs: the methods, sample data, parameters, and "expected results" recorded in the free-form summary, plus the testable structure the interface/data-flow briefs and the nearest IWC exemplar imply.

Set the plan's `source.derived_from` to `intent` (not `test-evidence`) and each synthesized assertion's `evidence` to `intent`; most synthesized assertions are `confidence: medium` or `low`. Where the summary does carry a concrete expected value (a known count, a named output token, a published figure), record it as `expected_value` and raise the confidence.

### Labels and fixtures are assumed, not bound

This skill consumes the template-era briefs, not the concrete workflow draft or the resolved test-data refs — those exist in the harness run-state by the time the plan is authored, but they are reconciled downstream rather than here. So:

- Bind assertions to the labels the interface brief pins, and set `label_status` to `assumed` (or `unresolved` when even the brief is silent) and the plan's `workflow.label_source` to `interface-brief`. implement-galaxy-workflow-test reconciles these against the real draft labels and the workflow-label cross-check.
- Record fixtures with `storage: unresolved` and `location: null` when the free-form summary names test data only by description; capture what is known (a dataset name, an accession, a Zenodo DOI, a rough size) in `fixture.provenance` so test-data resolution and the implement skill can act on it. Use iwc-test-data-conventions for the storage classes and the remote-URL-first convention.

When a binding or fixture cannot be settled from the briefs, add an `unresolved[]` entry (with `blocking: true` when the final test cannot be authored without it) rather than inventing a label or a URL.

### Choosing assertions from intent

For each expected output the briefs expose, pick the assertion family by output type per planemo-asserts-idioms and a defensible tolerance. When the only exposed output is weakly assertable (a stochastic plot, an opaque binary), consult galaxy-workflow-testability-design: prefer recording assertion intent against a stronger promoted checkpoint, and when you settle for a weak check, record the weaker outputs in `omissions[]` with a rationale rather than asserting around them. Check each shortcut against iwc-shortcuts-anti-patterns so an existence-only or size-only intent is a deliberate choice.

Keep the plan addressable by stable labels and artifacts (planemo-workflow-test-architecture) so the downstream test, run, and debug skills can connect assertions back to invocations and outputs.

## Runtime Notes

- Do not read Foundry source files at runtime; use only files packaged in this skill bundle and user-supplied artifacts.
- Preserve declared artifact filenames unless the user or harness supplies explicit paths.
- Carry unresolved assumptions into the output artifact instead of silently inventing missing source evidence.
