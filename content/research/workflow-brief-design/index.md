---
type: research
title: "Workflow Brief"
tags:
  - meta
status: draft
created: 2026-09-17
revised: 2026-09-17
revision: 4
summary: "Markdown Workflow Brief definition and section contract for scope, constraints, agent environment, and explicit blockers."
---

# Workflow Brief

A Workflow Brief is an expert-editable document describing what a workflow should achieve, what it should leave out, and the constraints under which an agent will build and run it. It is an input to design and implementation. The draft workflow captures the proposed steps, wiring, and tool state.

## Document shape

The brief is Markdown with a title and two sections: `## Workflow` and `## Agent Environment`. The workflow needs an objective; most details are optional. The agent environment must contain a description, which can explicitly record what still needs to be checked.

The `workflowBriefSchema` declaration uses the shared engine described in [[markdown-document-contract]] and lives in `packages/gxwf-foundry/src/workflow-brief.ts`. An illustrative document lives in `packages/gxwf-foundry/test/fixtures/workflow-brief/read-alignment.md`.

| Heading | Required | Content |
| --- | --- | --- |
| `## Workflow` | Yes | Scientific intent and scope. |
| `### Objective` | Yes, under Workflow | Scientific goal and desired outcome. |
| `### Sources` | No | Papers, interviews, repositories, relevant source pins, and evidence availability. |
| `### Scope` | No | Optional `#### Included` and `#### Excluded` describe selected work and boundaries. |
| `### Inputs and outputs` | No | Scientific roles and source-supported formats or organization. |
| `### Requirements and preferences` | No | Expert or source requirements, their strength, rationale, and evidence. |
| `### Acceptance criteria` | No | High-level behaviors that establish success. |
| `### Open questions` | No | Questions that do not prevent work from proceeding. |
| `### Decisions` | No | Expert decisions and rationale. |
| `### Related artifacts` | No | Links to source evidence and other relevant inputs. |
| `### Blockers` | No, under Workflow | Unresolved issues that prevent design or implementation. Any content blocks work. |
| `## Agent Environment` | Yes | Agent tooling and operating conditions. |
| `### Tooling` | No | Expected Foundry tooling and versions, and what is known about availability. |
| `### Constraints` | No | Agent workspace, network, installation, resource, and access restrictions. |
| `### Containerization` | No | Container preference and Docker, Singularity, or Apptainer availability. |
| `### Blockers` | No, under Agent Environment | Environment issues that prevent work. Any content blocks work. |

Headings are case-insensitive; section order is flexible and additional sections are allowed. Recognized sections are unique within their parent. If present, ordinary sections need content beyond headings, comments, or separators. Blockers may be empty. Scope's Included and Excluded subsections are optional.

## Workflow content

The writing agent must record evidence and expert intent without making Galaxy design choices. It must not assume Galaxy datatypes, dataset collection structures, tool availability, interface labels, or concrete tool versions. Source formats and explicitly named source tools can be cited as evidence; they do not establish a Galaxy mapping or an installed wrapper. An expert may supply specific Galaxy requirements here, and the agent must identify them as expert-provided rather than inferred.

The agent must not write a step graph, concrete tool state, or final test declarations into the brief. Interface design, data-flow design, tool discovery, and test development belong to the downstream design and implementation Molds. Inputs and outputs stay at scientific roles and source-supported descriptions. Acceptance criteria stay high-level; detailed fixtures and assertions belong to test development.

Requirements and preferences describe what the expert or source asks for. Agent Environment Constraints describe restrictions on the agent's work. Uncertainty that prevents proceeding belongs in Blockers; other questions can remain in Open questions.

## Agent environment

Tooling records whether expected tools such as `gxwf`, `foundry`, and `planemo` are available at the required versions. Distinguish intended requirements from observed availability. Containerization records the preference and whether Docker, Singularity, or Apptainer is actually usable, rather than assuming that an executable name proves a working engine.

A separate preflight result should record observed versions, container availability, source/reference access, writable paths, timestamps, and diagnostics. A requested installation strategy is not evidence of an installed executable.

## Validation and blockers

```sh
foundry validate-workflow-brief workflow-brief.md
foundry check-workflow-brief workflow-brief.md --json
```

Validation checks the title, required sections, unique recognized headings, content, and parent-scoped subsections. Example headings in fences, quotes, lists, or comments do not satisfy requirements. Success exits `0`, structural failures exit `3`, and input read failures exit `1`.

The static readiness check adds a check for `### Blockers` under both Workflow and Agent Environment. A structurally valid document with content in either section exits `4`; a structurally valid document without blockers exits `0`. Omit or leave Blockers empty when there are no blockers. Do not write “none” there: any content, including that word, is blocking. Comments and separators alone are empty. The JSON result includes `valid`, `ready`, `errors`, and blocker bodies with their parent and source line.

A clear static check only establishes structure and the absence of declared blockers. It does not establish semantic completeness, expert approval, or successful environment preflight. The harness must stop on declared blockers and apply its own review and preflight checks before implementation.

The exported `WorkflowBrief` and `WorkflowBriefSection` types describe the parsed document. `WorkflowBriefReadinessResult` describes the static check. These checks read the document without changing it.

## Lifecycle

1. A source-to-brief producer assembles evidence, proposed scope, and unanswered questions without Galaxy design assumptions.
2. The expert edits the brief and settles blockers needed before the next stage.
3. The harness checks structure, declared blockers, review, and environment readiness.
4. Brief-to-Galaxy consumes the brief and referenced evidence, then runs design, draft, implementation, and test development.

Brief-to-Galaxy and every design or implementation step must leave the brief unchanged. Record progress, learning, unresolved obligations, and recommended brief changes in the run's ledger. Updating the brief belongs to a separate expert editing step; an implementation agent must not resolve a blocker by rewriting its input.

A hand-authored brief is a first-class input. Implementation should work in a fresh session using the document and its referenced artifacts.

## Open design questions

- Should expert questions live here or link to a separate decision record?
