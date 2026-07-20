---
name: nextflow-test-to-galaxy-test-plan
description: "Translate Nextflow test evidence into a Galaxy workflow test plan."
---

# nextflow-test-to-galaxy-test-plan

Follow the procedure below and use the artifact/reference sections as the runtime contract.

## When To Use

- Translate Nextflow test evidence into a Galaxy workflow test plan.

## Inputs

- Read artifact `summary-nextflow`. Schema: summary-nextflow. Produced by `summarize-nextflow`. Structured Nextflow summary from summarize-nextflow; carries test_fixtures, nf_tests, snapshot evidence.

## Outputs

- Write artifact `galaxy-test-plan` as `galaxy-test-plan.yml`. Format: `yaml`. Schema: galaxy-workflow-test-plan. Reviewable Galaxy workflow test plan (see galaxy-workflow-test-plan): profile, fixture, snapshot, ignored-file, expected-output, rationale provenance translated from nf-test evidence.

## Required Tools

- None declared. Procedure should not assume external CLIs are present.

## Load Upfront

- `references/schemas/galaxy-workflow-test-plan.schema.json`: Schema file copied verbatim into the bundle. Output contract: the emitted plan conforms to galaxy-workflow-test-plan. Cast bundles the JSON Schema; validate with `foundry validate-galaxy-workflow-test-plan`.
- `references/schemas/summary-nextflow.schema.json`: Schema file copied verbatim into the bundle. Read summarized nf-test profiles, snapshot fixtures, selected test data, params, and expected outputs.

## Load On Demand

- `references/notes/component-nextflow-testing.md`: Research note copied verbatim into the bundle. Interpret nf-test profiles, snapshot assertions, and Nextflow fixture conventions before translating them. Use when: converting nf_tests, snapshot fixtures, test profiles, or source test-data references into a Galaxy workflow test plan.
- `references/notes/component-nextflow-testing.yml`: Companion file copied verbatim into the bundle. Sibling of `references/notes/component-nextflow-testing.md`; read it where that note directs.
- `references/notes/iwc-shortcuts-anti-patterns.md`: Research note copied verbatim into the bundle. Distinguish accepted IWC-style test shortcuts from assertion smells while translating tests. Use when: deciding whether to use existence-only, size-only, image-dimension, or tolerant output checks.
- `references/notes/iwc-test-data-conventions.md`: Research note copied verbatim into the bundle. Emit Galaxy/IWC-style job input fixtures, remote locations, hashes, and collection input shapes. Use when: writing job inputs or deciding whether fixtures belong in test-data, Zenodo, ENA/SRA, or CVMFS.
- `references/notes/nextflow-snapshot-to-galaxy-assertions.md`: Research note copied verbatim into the bundle. Translate nf-test snapshot captures, helper-pruned file lists, and snapshot checksums into Galaxy workflow-test assertion intent. Use when: converting nf-test snapshot fixtures, .snap sidecars, ignore files, ignore globs, or pipeline-level stable path/name captures.
- `references/notes/planemo-asserts-idioms.md`: Research note copied verbatim into the bundle. Describe Galaxy workflow-test assertion intent and tolerances for translated expected outputs. Use when: turning Nextflow expected outputs or snapshots into Galaxy test-plan assertions.
- `references/schemas/tests-format.schema.json`: Schema file copied verbatim into the bundle. Use the Galaxy workflow tests schema as the assertion vocabulary when translating Nextflow test evidence into a Galaxy test plan. Use when: mapping expected outputs, tolerances, snapshots, or fixture assertions into Galaxy workflow-test assertion intent.

## Validation

- Validate `galaxy-test-plan.yml` before returning it: run `foundry validate-galaxy-workflow-test-plan galaxy-test-plan.yml` from `@galaxy-foundry/foundry`. If the command is not on PATH, run `npx --package @galaxy-foundry/foundry foundry validate-galaxy-workflow-test-plan galaxy-test-plan.yml`. This checks artifact `galaxy-test-plan` against the galaxy-workflow-test-plan schema.

## Procedure

Translate Nextflow test evidence into a Galaxy workflow test plan. The output is a reviewable YAML handoff conforming to galaxy-workflow-test-plan, not a concrete `tests-format` file: preserve profile, fixture, snapshot, ignored-file, expected-output, and rationale provenance so implement-galaxy-workflow-test can author the final Galaxy test artifact with the right labels and assertions. Because this plan is translated from real nf-test evidence, set `source.derived_from: test-evidence` and prefer `evidence: test-evidence` on the assertions it carries.

## Runtime Notes

- Do not read Foundry source files at runtime; use only files packaged in this skill bundle and user-supplied artifacts.
- Preserve declared artifact filenames unless the user or harness supplies explicit paths.
- Carry unresolved assumptions into the output artifact instead of silently inventing missing source evidence.
