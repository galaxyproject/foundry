---
type: meta
title: "Issue Labels"
record_kind: infrastructure
order: 8
tags:
  - meta
status: draft
created: 2026-10-21
revised: 2026-10-21
revision: 1
summary: "What each label on galaxyproject/foundry issues means, which labels a triaged issue carries, and what reads them."
---

Labels on `galaxyproject/foundry` issues are read by more than people. The [[roadmap]] page is validated against them, a CI workflow flags issues that break the labelling rules, and agents choose their next issue from them. A label that is missing or wrong therefore moves an issue off the roadmap or hands it to the wrong driver.

## Triage an issue

An issue is triaged when it carries one `roadmap/*` label, one `priority/*` label and one `agent/*` label, and its parent link matches its roadmap label.

1. **Place it on the roadmap.** Apply `roadmap/main` to a backbone issue, `roadmap/substep` to a step under one, or `roadmap/off` when it does not belong on the roadmap.
2. **Link the parent.** A `roadmap/substep` issue becomes a GitHub sub-issue of exactly one `roadmap/main` issue. `roadmap/main` and `roadmap/off` issues have no parent.
3. **Set the priority.** `priority/mvp` or `priority/v2`.
4. **Choose the driver.** `agent/research`, `agent/implement` or `agent/human`.
5. **Mark blockers.** Add `upstream/*` or `requires-iwc-inputs` when the issue cannot move until something outside the Foundry changes.

The `needs-triage` label disappears on the next workflow run once steps 1–3 hold. Step 4 is required but not checked by the workflow.

## Roadmap

| Label | Meaning | Parent |
|---|---|---|
| `roadmap/main` | A large issue that forms part of the roadmap's backbone. | None |
| `roadmap/substep` | A smaller issue listed as a step under its `roadmap/main` parent. | Exactly one `roadmap/main` |
| `roadmap/off` | A person reviewed the issue and decided it is off the roadmap. | None |

`npm run validate:roadmap` requires every open `roadmap/main` issue in [[roadmap]], every `roadmap/substep` issue under its native parent, and no links to `roadmap/off` issues. [[build-and-validation]] describes the check.

## Priority

| Label | Meaning |
|---|---|
| `priority/mvp` | Needed for the initial paper or for using the Foundry now with correct results. |
| `priority/v2` | Not needed for an MVP. |

The roadmap lists `priority/mvp` work before `priority/v2` work. An off-roadmap issue still takes a priority.

## Driver

Each triaged issue carries exactly one `agent/*` label.

| Label | Meaning |
|---|---|
| `agent/research` | An agent researches the issue and posts the first comment for review. |
| `agent/implement` | An agent implements the issue and opens a pull request. |
| `agent/human` | A person drives the work. Agents do not pick it up. |

Agents choose `priority/mvp` before `priority/v2`, then `roadmap/main` before `roadmap/substep` before `roadmap/off`.

## Blockers

A blocker label means the issue cannot move until the named outside change lands. Agents skip blocked issues. The issue keeps its `agent/*` label, which says who drives it once the blocker clears. Remove the blocker label when it does.

| Label | Blocked until |
|---|---|
| `upstream/galaxy` | A change lands in Galaxy. |
| `upstream/planemo` | A change lands in Planemo. |
| `upstream/gxwf` | A change lands in gxwf. |
| `requires-iwc-inputs` | An IWC workflow uses the operation. Patterns are written from the corpus, not ahead of it ([[pattern-authorship]]). |

Link the upstream issue or pull request in a comment so the next reader can check whether it has landed.

## Needs triage

`needs-triage` is applied and removed by the `Issue Triage Labels` workflow (`.github/workflows/issue-triage-labels.yml`). Do not set or clear it by hand. The workflow flags an open issue when it:

- has no `roadmap/*` label or no `priority/*` label,
- is `roadmap/substep` without a `roadmap/main` parent, or
- is `roadmap/main` or `roadmap/off` with a parent.

The workflow runs on the `opened`, `reopened`, `labeled` and `unlabeled` issue events, and daily, because GitHub sends no event when a parent link changes. Its run summary names each flagged issue and the rule it breaks.

## GitHub defaults

`bug`, `enhancement` and `documentation` describe the kind of work and are optional. `duplicate`, `invalid`, `wontfix` and `question` keep their GitHub meanings.
