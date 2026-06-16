---
type: mold
name: nextflow-test-to-galaxy-test-plan
axis: source-specific
source: nextflow
tags:
  - mold
  - source/nextflow
status: draft
created: 2026-04-30
revised: 2026-05-05
revision: 4
ai_generated: true
summary: "Translate Nextflow test evidence into a Galaxy workflow test plan."
input_artifacts:
  - id: summary-nextflow
    description: "Structured Nextflow summary from [[summarize-nextflow]]; carries test_fixtures, nf_tests, snapshot evidence."
output_artifacts:
  - id: galaxy-test-plan
    kind: yaml
    default_filename: galaxy-test-plan.yml
    schema: "[[galaxy-workflow-test-plan]]"
    description: "Reviewable Galaxy workflow test plan (see [[galaxy-workflow-test-plan]]): profile, fixture, snapshot, ignored-file, expected-output, rationale provenance translated from nf-test evidence."
references:
  - kind: schema
    ref: "[[galaxy-workflow-test-plan]]"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: hypothesis
    purpose: "Output contract: the emitted plan conforms to [[galaxy-workflow-test-plan]]. Cast bundles the JSON Schema; validate with `foundry validate-galaxy-workflow-test-plan`."
    verification: "Cast the skill on an nf-core/bacass summary and confirm the emitted YAML validates and downstream [[implement-galaxy-workflow-test]] consumes it."
  - kind: schema
    ref: "[[summary-nextflow]]"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: corpus-observed
    purpose: "Read summarized nf-test profiles, snapshot fixtures, selected test data, params, and expected outputs."
  - kind: schema
    ref: "[[tests-format]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Use the Galaxy workflow tests schema as the assertion vocabulary when translating Nextflow test evidence into a Galaxy test plan."
    trigger: "When mapping expected outputs, tolerances, snapshots, or fixture assertions into Galaxy workflow-test assertion intent."
  - kind: research
    ref: "[[component-nextflow-testing]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: hypothesis
    purpose: "Interpret nf-test profiles, snapshot assertions, and Nextflow fixture conventions before translating them."
    trigger: "When converting nf_tests, snapshot fixtures, test profiles, or source test-data references into a Galaxy workflow test plan."
    verification: "Translate nf-core/bacass nf-test snapshots into a Galaxy test plan and confirm this note improves profile/snapshot extraction."
  - kind: research
    ref: "[[iwc-test-data-conventions]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Emit Galaxy/IWC-style job input fixtures, remote locations, hashes, and collection input shapes."
    trigger: "When writing job inputs or deciding whether fixtures belong in test-data, Zenodo, ENA/SRA, or CVMFS."
  - kind: research
    ref: "[[planemo-asserts-idioms]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Describe Galaxy workflow-test assertion intent and tolerances for translated expected outputs."
    trigger: "When turning Nextflow expected outputs or snapshots into Galaxy test-plan assertions."
  - kind: research
    ref: "[[nextflow-snapshot-to-galaxy-assertions]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Translate nf-test snapshot captures, helper-pruned file lists, and snapshot checksums into Galaxy workflow-test assertion intent."
    trigger: "When converting nf-test snapshot fixtures, .snap sidecars, ignore files, ignore globs, or pipeline-level stable path/name captures."
  - kind: research
    ref: "[[iwc-shortcuts-anti-patterns]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Distinguish accepted IWC-style test shortcuts from assertion smells while translating tests."
    trigger: "When deciding whether to use existence-only, size-only, image-dimension, or tolerant output checks."
related_notes:
  - "[[galaxy-workflow-test-plan]]"
  - "[[summary-nextflow]]"
  - "[[tests-format]]"
---
# nextflow-test-to-galaxy-test-plan

Translate Nextflow test evidence into a Galaxy workflow test plan. The output is a reviewable YAML handoff conforming to [[galaxy-workflow-test-plan]], not a concrete `tests-format` file: preserve profile, fixture, snapshot, ignored-file, expected-output, and rationale provenance so [[implement-galaxy-workflow-test]] can author the final Galaxy test artifact with the right labels and assertions. Because this plan is translated from real nf-test evidence, set `source.derived_from: test-evidence` and prefer `evidence: test-evidence` on the assertions it carries.
