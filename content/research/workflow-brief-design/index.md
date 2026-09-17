---
type: research
title: "[RFC/WIP] Workflow Brief — agent rough draft"
tags:
  - meta
status: draft
created: 2026-09-17
revised: 2026-09-17
revision: 1
summary: "Agent-written rough draft of a versioned Workflow Brief for scope, constraints, execution context, and workflow-specific learning; intended for GitHub review."
---

# [RFC/WIP] Workflow Brief — agent rough draft

A Workflow Brief is a versioned, expert-editable agreement about what a workflow should achieve, what it should leave out, and the constraints under which it will be built and run. It is the durable input to implementation and the place where workflow-specific decisions and learning accumulate.

The Workflow Brief captures the intent and boundaries that guide construction. The draft workflow captures the proposed implementation: steps, wiring, and tool state. The brief remains useful as implementations change or new attempts reveal constraints.

**This is an agent-written rough draft for discussion and line comments on GitHub, not an agreed design.** It responds to [Foundry issue #563](https://github.com/galaxyproject/foundry/issues/563). This PR supplies an experimental schema, generated TypeScript declarations, an illustrative fixture, and a structural validator. Pipeline integration and stage readiness remain proposals.

## Existing precedent

Foundry already validates sectioned YAML artifacts. The closest precedent is the Galaxy workflow test-plan handoff:

- Canonical contract: `packages/gxwf-foundry/src/schemas/galaxy-workflow-test-plan/galaxy-workflow-test-plan.schema.json`.
- The schema declares required top-level sections, strict nested objects, reusable `$defs`, enum values, and explicit nullable fields.
- `foundry validate-galaxy-workflow-test-plan galaxy-test-plan.yml` parses YAML and checks the resulting data through AJV.
- Exit codes are 0 for valid, 1 for input/parse failure, and 3 for schema failure; diagnostics identify the failing data path.
- A schema note under `content/schemas/` connects the package export and CLI validator to Mold outputs and generated cast validation manifests.
- Schema pages render reusable definitions as individually linkable sections. This is separate from validating Markdown headings or note frontmatter.

## Document contract

The proposed JSON Schema Draft 07 contract lives at `packages/gxwf-foundry/src/schemas/workflow-brief/workflow-brief.schema.json`. The illustrative YAML fixture lives at `packages/gxwf-foundry/test/fixtures/workflow-brief/read-alignment.yml`. The runtime schema wrapper and TypeScript declarations are generated from the canonical JSON during package sync.

All top-level sections and nested record fields are required. Unknown fields are rejected. Nullable values express an unknown; empty lists express no recorded entries. Neither form implies that a decision is approved or a capability has been verified.

| Section | Purpose |
| --- | --- |
| `brief_version` | Contract version, initially the string `"1"`. |
| `id`, `revision`, `title` | Stable identity, content revision, and readable name. Schema version and document revision are independent. |
| `sources` | Source identities, locations, pins where applicable, availability, and the selected sections or branches. This supports a paper with several analyses or a conversion of a pipeline subset. |
| `scope` | Scientific objective and explicit included and excluded work. |
| `interface` | Desired input/output roles and known datatype/shape requirements. IDs describe logical roles; they need not be final Galaxy labels. |
| `constraints` | Requirements graded `must` or `prefer`, with rationale and source evidence. Use these for fidelity, substitutions, portability, compute budgets, or other limits. |
| `environment.authoring` | Intended tools, workspace, and network policy for the agent building the workflow. |
| `environment.execution` | Intended target, Galaxy mode/version where relevant, container policy, tools, reference assets, writable locations, and resource limits. |
| `acceptance` | Behaviors and outputs that establish success, with evidence basis, expected result, and fixture if known. Detailed test cases stay in the existing test-plan artifact. |
| `questions` | Explicit decisions still needed, which stage they block, and their eventual resolution. A question can block execution without blocking implementation. |
| `decisions` | Expert choices and rationale. Evidence IDs refer to sources. |
| `learning` | Observations from identified implementation attempts, their implications, and links to evidence. A run observation does not silently become a new requirement. |
| `artifacts` | Linked summaries, design briefs, draft workflow, and test plan. Preserve existing detailed handoffs here. |

The brief need not contain a step graph, concrete tool state, or the final test file. Abstract data-flow detail can remain in a linked design brief. Source-specific material can remain in pinned summaries: e.g. Nextflow processes, profiles, containers, and nf-tests. Add a typed extension only when worked examples demonstrate a need.

## Validation and readiness

Structural validity is deliberately available during drafting. A brief with an unresolved reference choice can be valid and still be unready to execute.

A second semantic check should enforce:

1. Source IDs are unique; IDs are unique within each other record collection.
2. Every `evidence_ids` entry resolves to a source ID.
3. Galaxy execution selects a Galaxy mode; other targets use `not-applicable`. An external Galaxy needs a location before execution. Undecided choices remain legal while drafting.
4. Important undecided choices are represented by explicit questions. Resolved questions retain their resolution rather than disappearing.
5. Before implementation, no unresolved question blocks implementation. Before execution, no unresolved question blocks execution.
6. Implementations preserve the selected scope and `must` constraints; proposed substitutions or scope changes require an explicit decision and brief revision.

Rules 1–5 require semantic validation or harness checks beyond the initial JSON Schema. Rule 6 requires review of the generated artifacts against the brief.

Environment entries describe requirements, not observed installation status. A separate preflight result should bind to the brief revision and record observed versions, container availability, source/reference access, writable paths, timestamps, and diagnostics. A provisioning choice of `install` is a requested strategy, not evidence of an installed executable.

Expert approval belongs to the harness. Record it against the exact brief revision and content hash; editing the brief invalidates that approval. Schema validity alone never supplies approval. Implementation attempts should record the same revision/hash in their run metadata.

## Lifecycle

1. A source-to-brief producer assembles evidence, proposed scope, requirements, and unanswered questions.
2. The expert edits scope and constraints and resolves the questions needed for the next stage.
3. The harness records review of that exact revision.
4. Brief-to-Galaxy consumes the brief and referenced evidence, creates or updates the existing design handoffs, then runs the existing draft/implementation/test chain.
5. An attempt contributes observations with evidence. Accepted changes update the brief and increment its revision; a failed attempt does not automatically authorize broader scope or weaker acceptance criteria.

A hand-authored brief is a first-class input. Implementation must work in a fresh session using the brief and its referenced artifacts.

## Proposed Foundry integration

Follow the existing test-plan path:

- Add the canonical schema under `packages/gxwf-foundry/src/schemas/workflow-brief/`.
- Export `workflowBriefSchema` and add a YAML validator subcommand, provisionally `foundry validate-workflow-brief workflow-brief.yml`.
- Add `content/schemas/workflow-brief.md` with the package export and validator metadata.
- Declare the `workflow-brief` YAML output artifact on producer Molds and input artifact on consumers.
- Extend runtime checks with referential validation and explicit stage readiness.
- Test that edited scope and environment choices survive a fresh-session implementation and that learning survives into a subsequent brief revision.

This RFC implements `foundry validate-workflow-brief workflow-brief.yml` for structural validation only. Referential validation, approval binding, preflight, stage readiness, and source-to-brief / brief-to-Galaxy pipelines are follow-up proposals.

## Questions for GitHub review

- Which fields belong in a first brief, and which should stay in linked handoffs?
- Should scope items have stable IDs for tracing acceptance and implementation?
- Is the split between authoring and execution environments sufficient?
- Should expert questions live here or link to a separate decision record?
- How should requirements, the open-requirements ledger, and attempt learning interact?
- What evidence should establish that a brief revision is ready to implement or execute?
