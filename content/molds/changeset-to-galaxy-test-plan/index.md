---
type: mold
name: changeset-to-galaxy-test-plan
axis: source-specific
source: galaxy
target: galaxy
tags:
  - mold
  - source/galaxy
  - target/galaxy
status: draft
created: 2026-07-01
revised: 2026-07-01
revision: 1
ai_generated: true
summary: "Carry an existing Galaxy workflow's tests forward as a regression baseline and augment them for a change-set's deltas, emitting a Galaxy test plan."
input_artifacts:
  - id: summary-galaxy-workflow
    description: "Structured summary of the existing workflow from [[summarize-galaxy-workflow]]; its `tests[]` are the regression baseline to carry forward, and its resolved input/output labels are the anchors baseline assertions bind to."
  - id: galaxy-workflow-changeset
    description: "Reviewed, step-anchored change-set from [[interview-to-galaxy-workflow-changeset]]; names which edits change observable behavior, hence which baseline cases to update and which new assertions to add."
output_artifacts:
  - id: galaxy-test-plan
    kind: yaml
    default_filename: galaxy-test-plan.yml
    schema: "[[galaxy-workflow-test-plan]]"
    description: "Reviewable Galaxy workflow test plan (see [[galaxy-workflow-test-plan]]): baseline cases carried forward as test-evidence plus change-set-driven cases/assertions, with job inputs, expected outputs, assertion intent, fixture provenance, label status, unresolved mappings, and omissions."
references:
  - kind: schema
    ref: "[[galaxy-workflow-test-plan]]"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: hypothesis
    purpose: "Output contract: the emitted plan conforms to [[galaxy-workflow-test-plan]]. Cast bundles the JSON Schema so the skill carries its output shape; validate with `foundry validate-galaxy-workflow-test-plan`."
    verification: "Cast the skill, run on a summary with existing tests plus a change-set, confirm the emitted YAML validates and downstream [[implement-galaxy-workflow-test]] consumes it without re-reading the change-set."
  - kind: schema
    ref: "[[summary-galaxy-workflow]]"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: cast-validated
    purpose: "Input contract: read the existing workflow's `tests[]` (the regression baseline) and its resolved input/output labels so baseline assertions bind to real labels."
  - kind: schema
    ref: "[[tests-format]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Use the Galaxy workflow tests schema as the assertion-family vocabulary when carrying forward or synthesizing assertion intent."
    trigger: "When naming an assertion family or compare operator for a carried-forward or change-set-driven expected output."
  - kind: research
    ref: "[[galaxy-workflow-testability-design]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Decide which change-set-exposed outputs and promoted checkpoints make meaningful new assertions, and how much a baseline assertion must loosen when an edit intentionally changes an output."
    trigger: "When adding assertions for a newly exposed output or a new step, or reconciling a baseline assertion an edit invalidates."
  - kind: research
    ref: "[[iwc-test-data-conventions]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Record job-input fixtures for change-set-added inputs (remote-URL-first locations, hashes, collection shapes) as fixture provenance, reusing the baseline's existing fixtures unchanged."
    trigger: "When a change-set adds a workflow input that needs new test data, or when recording provenance for a new fixture."
  - kind: research
    ref: "[[planemo-asserts-idioms]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Pick the assertion family and tolerance for each change-set-driven expected output by output type."
    trigger: "When turning a change-set behavioral delta into assertion intent and a tolerance."
  - kind: research
    ref: "[[iwc-shortcuts-anti-patterns]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Distinguish accepted IWC-style test shortcuts from assertion smells when loosening a baseline assertion or synthesizing a new one."
    trigger: "When considering existence-only, size-only, image-dimension, or tolerant output checks, or recording an omission."
  - kind: research
    ref: "[[planemo-workflow-test-architecture]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Keep the plan addressable by stable labels and artifacts Planemo can connect back to invocations, jobs, and outputs."
    trigger: "When recording the labels and checkpoints the downstream test must address."
related_molds:
  - "[[summarize-galaxy-workflow]]"
  - "[[interview-to-galaxy-workflow-changeset]]"
  - "[[implement-galaxy-workflow-test]]"
  - "[[nextflow-test-to-galaxy-test-plan]]"
related_notes:
  - "[[galaxy-workflow-test-plan]]"
  - "[[summary-galaxy-workflow]]"
  - "[[tests-format]]"
---
# changeset-to-galaxy-test-plan

Produce a Galaxy workflow test plan for the update pipeline: carry the existing workflow's tests forward as a **regression baseline** and augment them for the change-set's behavioral deltas. The output is a reviewable YAML handoff conforming to [[galaxy-workflow-test-plan]], not a concrete `tests-format` file — [[implement-galaxy-workflow-test]] authors the final `*-tests.yml` from it. This Mold is the update pipeline's analogue of [[nextflow-test-to-galaxy-test-plan]] / [[freeform-summary-to-galaxy-test-plan]]: the dedicated test-plan producer every Galaxy-targeting pipeline places before the implement step.

## Translate-and-augment, not synthesize-from-scratch

The starting point is real test evidence — the existing workflow's own `tests[]`, captured in [[summary-galaxy-workflow]]. Most of the plan is those cases carried forward, so its **dominant basis is test-evidence**: set `source.kind: galaxy` and `source.derived_from: test-evidence`. `source.derived_from` is the plan's dominant basis, not a "was anything mixed" flag — the carried-forward baseline dominates, so it reads `test-evidence` even though the plan also carries synthesized change-set cases. The mix shows through at the finer grains: baseline cases keep `test_cases[].derived_from: test-evidence` with `evidence: test-evidence` on their assertions, while change-set-driven cases carry `test_cases[].derived_from: intent` (or `mixed` when a carried-forward case gains a change-set-driven assertion) and their assertions carry `evidence: intent` (raise to `test-evidence` only where the change-set pinned a concrete expected value). `mixed` is valid only at the case level, never at `source.derived_from`. Unlike a freeform-synthesized plan, the baseline's workflow-label bindings are `label_status: resolved` — the summary read them off the concrete existing workflow, so they are known, not assumed.

## What the change-set drives

Walk the change-set and touch only the assertions its edits reach:

- **Behavior-changing edit → update the affected baseline case.** A `change-parameter`, `replace-tool`, or `add-step` that alters an existing output's content means the baseline assertion on that output is now wrong. Update it — tighten to the new expected value where the change-set gave one, or loosen it (e.g. presence/format where a content check no longer holds) and record the loosening in `omissions[]` with a rationale. **Never delete a baseline case to make it pass**; a regression that silently drops coverage is the failure mode this pipeline exists to avoid.
- **New observable behavior → a new assertion or case.** An `expose-output` / `add-output` needs a new `expected_outputs[]` entry asserting the promoted output; a new step whose result is observable needs assertion intent for it; a new `add-input` needs a `job_inputs[]` binding and a fixture. Bind change-set-added labels at `label_status: assumed` (the concrete labels settle downstream once the per-step loop resolves the step) and reconcile them in [[implement-galaxy-workflow-test]].
- **Internal-only edit → no assertion change.** A `rewire`, `relabel`, or `remove-step` that does not change an observable output changes no assertions; carry the baseline through untouched.

## Scope discipline mirrors the change-set

Change only the assertions the change-set reaches. Do not add assertions for untouched regions beyond what the baseline already covers, and do not tidy or re-tolerance a baseline assertion no edit touched — the update pipeline's contract is that untouched behavior is verified exactly as before. Gratuitous churn in the plan propagates into gratuitous test churn downstream.

## Fixtures

Reuse the baseline's existing fixtures verbatim — they already ship with the workflow and are the regression data. Only a change-set that adds a workflow input needs new test data: record it with [[iwc-test-data-conventions]] (remote-URL-first, `storage: unresolved` with provenance when the input names data only by description), and leave resolution to the harness test-data step / [[find-test-data]] and [[implement-galaxy-workflow-test]]. When an added input's data cannot be settled here, add an `unresolved[]` entry (with `blocking: true` when the new case cannot be authored without it) rather than inventing a location.

Keep the plan addressable by stable labels and artifacts ([[planemo-workflow-test-architecture]]) so the downstream test, run, and debug Molds can connect assertions back to invocations and outputs.
