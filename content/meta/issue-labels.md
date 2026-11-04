---
type: meta
title: "Issue Labels"
record_kind: infrastructure
order: 8
tags:
  - meta
status: draft
created: 2026-10-21
revised: 2026-11-04
revision: 4
summary: "What each label on galaxyproject/foundry issues means, which labels a triaged issue carries, and what reads them."
---

Labels on `galaxyproject/foundry` issues are read by more than people. The [[roadmap]] page is validated against them, a CI workflow flags issues that break the labelling rules, and agents choose their next issue from them. A label that is missing or wrong therefore moves an issue off the roadmap or hands it to an agent that cannot act on it.

## Triage an issue

An issue is triaged when it carries one `roadmap/*` label and one `priority/*` label, its parent link matches its roadmap label, and it carries either one `work/*` label or one or more blocker labels.

1. **Place it on the roadmap.** Apply `roadmap/main` to a backbone issue, `roadmap/substep` to a step under one, or `roadmap/off` when it does not belong on the roadmap.
2. **Link the parent.** A `roadmap/substep` issue becomes a GitHub sub-issue of exactly one `roadmap/main` issue. `roadmap/main` and `roadmap/off` issues have no parent.
3. **Set the priority.** `priority/mvp` or `priority/v2`.
4. **Mark blockers.** Add `upstream/*` or `requires-iwc-inputs` when the issue cannot move until something outside the Foundry changes.
5. **Set the work state** of an unblocked issue. `work/ready-research`, `work/ready-implement` or `work/human`.

The `needs-triage` label disappears on the next workflow run once these hold.

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

## Work state

An unblocked issue carries exactly one `work/*` label. It says whether an agent may pick the issue up now, and who holds it otherwise.

| Label | Meaning | Next |
|---|---|---|
| `work/ready-research` | An agent may pick it up, research it and post the first comment. | `work/in-progress` |
| `work/ready-implement` | An agent may pick it up, implement it and open a pull request. | `work/in-progress` |
| `work/in-progress` | Someone has claimed it. Their comment links the branch, pull request or upstream work. | `work/needs-review` after research, or closed by the merged pull request |
| `work/needs-review` | An agent posted research findings and a person needs to read them. | Whatever the reviewer decides |
| `work/human` | A person drives the work. Agents do not pick it up. | Set by that person |

Agents pick up only `work/ready-*` issues, `priority/mvp` before `priority/v2`, then `roadmap/main` before `roadmap/substep` before `roadmap/off`. Claiming an issue means replacing its `work/ready-*` label with `work/in-progress` and commenting with a link to the work, so a second agent does not start the same issue. An agent that gives up restores the `work/ready-*` label it replaced. Pull requests ask for review through GitHub review requests, so an implemented issue stays `work/in-progress` until its pull request merges and closes it.

## Blockers

A blocker label means the issue cannot move until the named outside change lands. It replaces the `work/*` label, because nobody can pick a blocked issue up. Whoever removes the last blocker sets the `work/*` label in the same edit, and decides it then because the right next step often changes once the upstream fix lands. A comment can record what the triager expects that step to be.

| Label | Blocked until |
|---|---|
| `upstream/galaxy` | A change lands in Galaxy. |
| `upstream/planemo` | A change lands in Planemo. |
| `upstream/gxwf` | A change lands in gxwf. |
| `upstream/gxformat2` | A change lands in gxformat2. |
| `upstream/tools` | A change lands in a Galaxy tool wrapper repository, such as tools-iuc. |
| `upstream/tool-shed` | A change lands in the Tool Shed. |
| `requires-iwc-inputs` | An IWC workflow uses the operation. Patterns are written from the corpus, not ahead of it ([[pattern-authorship]]). |

Link the upstream issue or pull request in a comment so the next reader can check whether it has landed.

## Needs triage

`needs-triage` is applied and removed by the `Issue Triage Labels` workflow (`.github/workflows/issue-triage-labels.yml`). Do not set or clear it by hand. The workflow flags an open issue when it:

- has no `roadmap/*` label or no `priority/*` label,
- is `roadmap/substep` without a `roadmap/main` parent,
- is `roadmap/main` or `roadmap/off` with a parent,
- has neither a `work/*` label nor a blocker label,
- has more than one `work/*` label, or
- has both a `work/*` label and a blocker label.

The workflow runs on the `opened`, `reopened`, `labeled` and `unlabeled` issue events, and daily, because GitHub sends no event when a parent link changes. Its run summary names each flagged issue and the rule it breaks.

## GitHub defaults

`bug`, `enhancement` and `documentation` describe the kind of work and are optional. `duplicate`, `invalid`, `wontfix` and `question` keep their GitHub meanings. `good first issue` marks a small, self-contained starting point for new contributors; [[start-contributing]] links to them.
