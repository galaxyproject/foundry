---
type: research
title: "Workflow Brief"
tags:
  - meta
status: draft
created: 2026-09-17
revised: 2026-09-17
revision: 2
summary: "Markdown Workflow Brief definition and section contract for scope, constraints, execution context, and workflow-specific learning."
---

# Workflow Brief

A Workflow Brief is an expert-editable document describing what a workflow should achieve, what it should leave out, and the constraints under which it will be built and run. It is the durable input to implementation and the place where workflow-specific decisions and learning accumulate.

The brief captures intent and boundaries. The draft workflow captures the proposed implementation: steps, wiring, and tool state. The brief remains useful as implementations change or new attempts reveal constraints.

## Document shape

The brief is Markdown with a document title and named sections. Prose, lists, tables, diagrams, and links can express requirements and evidence. No YAML frontmatter or serialized requirement records are required by this contract.

The section declaration lives in `packages/gxwf-foundry/src/workflow-brief.ts`. The illustrative document lives in `packages/gxwf-foundry/test/fixtures/workflow-brief/read-alignment.md`.

| Heading | Required | Content |
| --- | --- | --- |
| `## Objective` | Yes | Scientific goal and desired outcome. |
| `## Sources` | Yes | Papers, interviews, repositories, source pins where relevant, selected analyses, and evidence availability. |
| `## Scope` | Yes | `### Included` and `### Excluded` identify the selected work and its explicit boundaries. |
| `## Inputs and outputs` | Yes | Required inputs and outputs, their logical roles, and relevant shape or datatype requirements. These need not be final Galaxy labels. |
| `## Constraints` | Yes | Mandatory requirements and preferences, with rationale and supporting evidence. State their strength in prose. |
| `## Environment` | Yes | `### Authoring` covers the agent's tooling, versions, workspace, and access. `### Execution` covers the intended runtime, Galaxy mode, container policy, reference assets, writable paths, and resource limits. |
| `## Acceptance criteria` | Yes | Observable behaviors that establish success and test data if known. Detailed cases remain in the test-plan handoff. |
| `## Open questions` | Yes | Decisions still needed, which stage they block, and their eventual resolution. State explicitly when none remain. |
| `## Decisions and learning` | No | Expert choices with rationale, and findings from identified implementation attempts with links to evidence. |
| `## Related artifacts` | No | Source summaries, detailed design handoffs, draft workflow, and test plan. |

Headings are case-insensitive and need not follow a fixed order. Additional sections and deeper subsections are allowed. Recognized sections must occur at most once and contain text beyond their headings; HTML comments and separators alone do not count. Unknowns and “none” are legitimate content when stated explicitly.

The brief need not contain a step graph, concrete tool state, or the final test file. Source-specific evidence can stay in linked summaries and design handoffs, including Nextflow processes, profiles, containers, and nf-tests.

## Validation and types

```sh
foundry validate-workflow-brief workflow-brief.md
```

The validator parses Markdown syntax and checks the title, required sections, duplicate recognized headings, nonempty content, and required subsections within their parent. Headings inside code fences, block quotes, and HTML comments do not satisfy the contract.

Success prints `<path>: valid` and exits `0`. Structural failures produce diagnostics and exit `3`. Input read failures exit `1`. Markdown itself is permissive; an incomplete document fails the section contract rather than a YAML parse.

The exported `WorkflowBrief` and `WorkflowBriefSection` interfaces describe the parsed title, section headings, source line numbers, preserved Markdown bodies, and nested sections. They do not turn narrative requirements into structured records or claim that a paragraph is semantically correct.

## Readiness

A structurally valid brief may still be unready to implement or execute. A question can block execution without blocking implementation. Stage readiness and expert approval belong to the harness and need their own explicit checks.

Environment descriptions record intended requirements. A separate preflight result should record observed versions, container availability, source/reference access, writable paths, timestamps, and diagnostics. A requested installation strategy is not evidence of an installed executable.

Bind review and implementation attempts to the exact brief revision or content hash. When accepted learning changes scope or requirements, retain the rationale and identify the new document revision.

## Lifecycle

1. A source-to-brief producer assembles evidence, proposed scope, requirements, and unanswered questions.
2. The expert edits the brief and settles decisions needed for the next stage.
3. The harness records review of that exact document revision.
4. Brief-to-Galaxy consumes the document and referenced evidence, creates or updates detailed design handoffs, then runs the existing draft/implementation/test chain.
5. Implementation attempts contribute observations with evidence. Accepted changes update the brief; failure alone does not authorize broader scope or weaker acceptance criteria.

A hand-authored brief is a first-class input. Implementation should work in a fresh session using the document and its referenced artifacts. The `workflow-brief` handoff can be declared as a Markdown artifact when producer and consumer Molds are introduced.

## Open design questions

- Which sections should be required for an initial brief?
- Should any fields need stronger validation than section presence and content?
- Is the split between authoring and execution environments sufficient?
- Should expert questions live here or link to a separate decision record?
- How should requirements, the open-requirements ledger, and attempt learning interact?
- What evidence should establish readiness to implement or execute?
