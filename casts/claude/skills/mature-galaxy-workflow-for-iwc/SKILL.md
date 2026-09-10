---
name: mature-galaxy-workflow-for-iwc
description: "Apply the IWC publication checklist to an existing Galaxy workflow and emit a generalized, reviewable submission set."
---

# mature-galaxy-workflow-for-iwc

Follow the procedure below and use the artifact/reference sections as the runtime contract.

## When To Use

- Apply the IWC publication checklist to an existing Galaxy workflow and emit a generalized, reviewable submission set.

## Inputs

- Read artifact `starting-galaxy-workflow`. Produced by `summarize-galaxy-workflow`. The normalized concrete gxformat2 workflow to mature, normally emitted by summarize-galaxy-workflow; this is the only required input.
- Read artifact `summary-galaxy-workflow`. Optional; absence is allowed and must be reported honestly. Schema: summary-galaxy-workflow. Produced by `summarize-galaxy-workflow`. Optional structured summary from summarize-galaxy-workflow; derive the needed facts from the workflow when this artifact is absent.
- Read artifact `galaxy-workflow-test`. Optional; absence is allowed and must be reported honestly. Produced by `implement-galaxy-workflow-test`, `mature-galaxy-workflow-for-iwc`. Optional existing workflow test; preserve its assertions and update only keys that must follow supported workflow-label changes.
- Read artifact `open-requirements-ledger`. Optional; absence is allowed and must be reported honestly. Produced by `advance-galaxy-draft-step`, `apply-galaxy-workflow-changeset`, `compare-against-iwc-exemplar`, `cwl-summary-to-galaxy-data-flow`, `cwl-summary-to-galaxy-interface`, `cwl-summary-to-galaxy-template`, `freeform-summary-to-galaxy-data-flow`, `freeform-summary-to-galaxy-interface`, `freeform-summary-to-galaxy-template`, `implement-galaxy-tool-step`, `interview-to-galaxy-workflow-changeset`, `mature-galaxy-workflow-for-iwc`, `nextflow-summary-to-galaxy-data-flow`, `nextflow-summary-to-galaxy-interface`, `nextflow-summary-to-galaxy-reference-data`, `nextflow-summary-to-galaxy-template`, `repair-galaxy-draft-topology`. Optional carried obligations ledger open-requirements-ledger; initialize an empty ledger when it is absent and append unresolved maturation decisions.
- Read artifact `iwc-publication-context`. Optional; absence is allowed and must be reported honestly. Optional user or harness context for intended use, repository slug, creators, ORCIDs, citations, license, release, and durable test-data URLs.
- Read artifact `iwc-workflow-readme`. Optional; absence is allowed and must be reported honestly. Produced by `mature-galaxy-workflow-for-iwc`. Optional existing workflow README to update while preserving accurate material that remains relevant after maturation.
- Read artifact `iwc-workflow-changelog`. Optional; absence is allowed and must be reported honestly. Produced by `mature-galaxy-workflow-for-iwc`. Optional existing workflow changelog to extend without rewriting or discarding prior release history.
- Read artifact `iwc-dockstore-metadata`. Optional; absence is allowed and must be reported honestly. Produced by `mature-galaxy-workflow-for-iwc`. Optional existing Dockstore metadata to align with the workflow, test, and evidence-backed creator metadata.

## Outputs

- Write artifact `galaxy-workflow` as `galaxy-workflow.gxwf.yml`. Format: `yaml`. Matured concrete gxformat2 workflow with supported IWC metadata, naming, annotation, and purpose-preserving genericity corrections applied.
- Write artifact `galaxy-workflow-test` as `galaxy-workflow.gxwf-tests.yml`. Optional; absence is allowed and must be reported honestly. Format: `yaml`. Updated or unchanged supplied workflow test; absent when no test was provided because this Mold must not invent expected results.
- Write artifact `iwc-workflow-readme` as `README.md`. Format: `markdown`. Proposed IWC workflow README describing evidenced purpose, valid inputs, expected outputs, and relevant comparisons or resources.
- Write artifact `iwc-workflow-changelog` as `CHANGELOG.md`. Format: `markdown`. Proposed IWC changelog preserving prior history and recording only the release and maturation changes supported by available evidence.
- Write artifact `iwc-dockstore-metadata` as `.dockstore.yml`. Format: `yaml`. Proposed Dockstore metadata whose workflow and test paths and evidenced creators agree with the emitted submission files.
- Write artifact `iwc-maturation-report` as `iwc-maturation-report.md`. Format: `markdown`. Per-checklist status report with evidence, before-and-after changes, unresolved decisions, source pin, and explicit downstream validation disclaimer.
- Write artifact `open-requirements-ledger` as `open-requirements.ledger.yml`. Format: `yaml`. Carried or initialized obligations ledger with unresolved IWC maturation decisions appended and all prior entries preserved.

## Required Tools

- None declared. Procedure should not assume external CLIs are present.

## Load Upfront

- `references/prompts/workflow-pr-review-command.md`: prompt reference copied verbatim into the bundle. Use the pinned upstream IWC reviewer checklist and its explicit output-label and naming checks as the primary review sequence before applying supported corrections.
- `references/notes/open-requirements-ledger.md`: Research note copied verbatim into the bundle. Initialize, preserve, and append precise unresolved maturation obligations rather than guessing authorship, licensing, or scientific intent.
- `references/schemas/summary-galaxy-workflow.schema.json`: Schema file copied verbatim into the bundle. Interpret a supplied workflow summary without making that convenience artifact mandatory for direct use of this Mold.

## Load On Demand

- `references/notes/galaxy-workflow-testability-design.md`: Research note copied verbatim into the bundle. Keep workflow interface and test addressing aligned when a safe genericity or human-readable-label correction changes the workflow interface. Use when: maturation changes an input, promoted output, collection identifier, or workflow-output label referenced by a supplied test.
- `references/notes/iwc-test-data-conventions.md`: Research note copied verbatim into the bundle. Apply current IWC conventions for test labels, durable remote fixtures, creator identifiers, release changes, and companion-file naming. Use when: a supplied test, test-data reference, creator record, or release decision must be checked or updated.

## Validation

- None declared.

## Procedure

Take one concrete gxformat2 workflow and prepare an inspectable IWC-oriented revision. This is a single cohesive maturation action: read the upstream policy, fill what the evidence supports, make obvious purpose-preserving generalizations, keep an existing test aligned, prepare the normal companion files, and explain both the edits and the decisions that remain open.

The workflow is the only required input. A summary, test, prior companions, ledger, and contributor context all improve the result but must not be prerequisites.

### Procedure

#### 1. Inventory the supplied evidence

- Read `starting-galaxy-workflow.gxwf.yml` as the source of truth.
- Use `summary-galaxy-workflow.json` when supplied, but reconcile it against the workflow and derive the same facts directly when it is absent.
- Discover each optional input explicitly. Preserve supplied tests and companion documents as edit baselines. Initialize `open-requirements.ledger.yml` with `entries: []` when no ledger is supplied.
- Record which inputs were present in the report. Never describe an absent artifact as inspected.

#### 2. Apply the pinned IWC policy

Read the bundled IWC review prompt and apply every applicable check. Treat its pinned revision as the upstream policy source for this run, record that revision in the report, and never imply that newer policy was evaluated.

For every checklist item, record exactly one status:

- `pass` — evidence shows the item was already satisfied;
- `changed` — this run made a supported correction;
- `needs-user-input` — a consequential choice lacks evidence; or
- `not-applicable` — with a specific reason.

Inspect the workflow metadata and annotation, input/output and promoted-output labels, folder/file naming recommendation, genericity, README, changelog, Dockstore paths and creators, workflow/test label agreement, and test-data placement. Cite the file and field or section used for every conclusion.

#### 3. Make only supported edits

Apply clear mechanical corrections: human-readable names, descriptive annotations grounded in the graph, label synchronization, companion paths, and removal of obviously sample-specific naming. Generalize a hard-coded sample value or path only when its role is unambiguous and an input can replace it without changing scientific behavior.

Preserve unrelated regions byte-for-byte where practical. Do not change tool identity or version, graph topology, scientifically meaningful defaults, test strength, or assertions merely to satisfy style guidance.

Never invent creators, ORCIDs, citations, license choices, release history, scientific purpose, reference-data strategy, or durable URLs. Use `iwc-publication-context` only as supplied evidence. When evidence is missing, leave the relevant value unchanged or visibly unresolved, set the checklist item to `needs-user-input`, and append a focused ledger entry saying what decision or evidence would resolve it.

#### 4. Keep the workflow and test coherent

When a supplied test exists, preserve every job input and assertion except for the smallest change required by a supported interface-label edit. Update test keys in the same run as the corresponding workflow labels. Do not weaken assertions or manufacture expected outputs.

When no test exists, emit no `galaxy-workflow-test` artifact. Record `needs-user-input` for the missing test and point to the existing Galaxy test-planning and implement-galaxy-workflow-test path. An absent optional output is an expected result here, not a successful test claim.

#### 5. Prepare ordinary IWC companions

- Create or update a README from evidenced workflow purpose, valid inputs, and expected outputs. Preserve useful supplied material. State unknown comparisons or tutorial links as unresolved; do not invent them.
- Create or update the changelog, preserving existing history and adding only an evidence-backed entry. If the release cannot be chosen safely, make that a ledger item rather than fabricating a version history.
- Create or update `.dockstore.yml` and align its paths with the emitted filenames. Preserve existing metadata and copy creator information only from workflow metadata or supplied context. Missing authorship is unresolved, not a license to guess.

#### 6. Report and hand off

Write `iwc-maturation-report.md` with the pinned IWC source revisions from the bundled references, supplied-input inventory, per-item status and evidence, concise before/after descriptions, unresolved ledger ids, and the exact emitted files. End with an explicit statement that this skill did not run terminal validation or workflow tests and did not create or update a GitHub pull request.

The downstream path owns validate-galaxy-workflow, run-workflow-test, repair/retest, and publication automation.

### Non-goals

- No Planemo execution or validation claim.
- No new expected test result or weakened assertion.
- No tool, topology, or scientific redesign without explicit evidence.
- No branch, pull request, comment, label, or other GitHub mutation.
- No publication-readiness or canonical-IWC claim.

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
