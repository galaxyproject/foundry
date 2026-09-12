---
type: mold
name: mature-galaxy-workflow-for-iwc
axis: target-specific
target: galaxy
tags:
  - source/galaxy
  - target/galaxy
  - lifecycle/publication
status: draft
created: 2026-09-10
revised: 2026-09-10
revision: 1
summary: "Apply the IWC publication checklist to an existing Galaxy workflow and emit a generalized, reviewable submission set."
input_artifacts:
  - id: starting-galaxy-workflow
    description: "The normalized concrete gxformat2 workflow to mature, normally emitted by [[summarize-galaxy-workflow]]; this is the only required input."
  - id: summary-galaxy-workflow
    optional: true
    description: "Optional structured summary from [[summarize-galaxy-workflow]]; derive the needed facts from the workflow when this artifact is absent."
  - id: galaxy-workflow-test
    optional: true
    description: "Optional existing workflow test; preserve its assertions and update only keys that must follow supported workflow-label changes."
  - id: open-requirements-ledger
    optional: true
    description: "Optional carried obligations ledger [[open-requirements-ledger]]; initialize an empty ledger when it is absent and append unresolved maturation decisions."
  - id: iwc-publication-context
    optional: true
    description: "Optional user or harness context for intended use, repository slug, creators, ORCIDs, citations, license, release, and durable test-data URLs."
  - id: iwc-workflow-readme
    optional: true
    description: "Optional existing workflow README to update while preserving accurate material that remains relevant after maturation."
  - id: iwc-workflow-changelog
    optional: true
    description: "Optional existing workflow changelog to extend without rewriting or discarding prior release history."
  - id: iwc-dockstore-metadata
    optional: true
    description: "Optional existing Dockstore metadata to align with the workflow, test, and evidence-backed creator metadata."
output_artifacts:
  - id: galaxy-workflow
    kind: yaml
    default_filename: galaxy-workflow.gxwf.yml
    description: "Matured concrete gxformat2 workflow with supported IWC metadata, naming, annotation, and purpose-preserving genericity corrections applied."
  - id: galaxy-workflow-test
    kind: yaml
    default_filename: galaxy-workflow.gxwf-tests.yml
    optional: true
    description: "Updated or unchanged supplied workflow test; absent when no test was provided because this Mold must not invent expected results."
  - id: iwc-workflow-readme
    kind: markdown
    default_filename: README.md
    description: "Proposed IWC workflow README describing evidenced purpose, valid inputs, expected outputs, and relevant comparisons or resources."
  - id: iwc-workflow-changelog
    kind: markdown
    default_filename: CHANGELOG.md
    description: "Proposed IWC changelog preserving prior history and recording only the release and maturation changes supported by available evidence."
  - id: iwc-dockstore-metadata
    kind: yaml
    default_filename: .dockstore.yml
    description: "Proposed Dockstore metadata whose workflow and test paths and evidenced creators agree with the emitted submission files."
  - id: iwc-maturation-report
    kind: markdown
    default_filename: iwc-maturation-report.md
    description: "Per-checklist status report with evidence, before-and-after changes, unresolved decisions, source pin, and explicit downstream validation disclaimer."
  - id: open-requirements-ledger
    kind: yaml
    default_filename: open-requirements.ledger.yml
    description: "Carried or initialized obligations ledger with unresolved IWC maturation decisions appended and all prior entries preserved."
references:
  - kind: prompt
    ref: "[[workflow-pr-review-command]]"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: corpus-observed
    purpose: "Use the pinned upstream IWC reviewer checklist and its explicit output-label and naming checks as the primary review sequence before applying supported corrections."
  - kind: schema
    ref: "[[summary-galaxy-workflow]]"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: cast-validated
    purpose: "Interpret a supplied workflow summary without making that convenience artifact mandatory for direct use of this Mold."
  - kind: research
    ref: "[[open-requirements-ledger]]"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: hypothesis
    purpose: "Initialize, preserve, and append precise unresolved maturation obligations rather than guessing authorship, licensing, or scientific intent."
    verification: "Exercise the ambiguous-reference fixture and confirm the emitted ledger carries a focused unresolved entry without a speculative workflow edit."
  - kind: research
    ref: "[[iwc-test-data-conventions]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Apply current IWC conventions for test labels, durable remote fixtures, creator identifiers, release changes, and companion-file naming."
    trigger: "When a supplied test, test-data reference, creator record, or release decision must be checked or updated."
  - kind: research
    ref: "[[galaxy-workflow-testability-design]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Keep workflow interface and test addressing aligned when a safe genericity or human-readable-label correction changes the workflow interface."
    trigger: "When maturation changes an input, promoted output, collection identifier, or workflow-output label referenced by a supplied test."
related_molds:
  - "[[summarize-galaxy-workflow]]"
  - "[[validate-galaxy-workflow]]"
  - "[[run-workflow-test]]"
  - "[[compare-against-iwc-exemplar]]"
related_notes:
  - "[[workflow-pr-review-command]]"
  - "[[open-requirements-ledger]]"
  - "[[iwc-test-data-conventions]]"
---
# mature-galaxy-workflow-for-iwc

Take one concrete gxformat2 workflow and prepare an inspectable IWC-oriented revision. This is a single cohesive maturation action: read the upstream policy, fill what the evidence supports, make obvious purpose-preserving generalizations, keep an existing test aligned, prepare the normal companion files, and explain both the edits and the decisions that remain open.

The workflow is the only required input. A summary, test, prior companions, ledger, and contributor context all improve the result but must not be prerequisites.

## Procedure

### 1. Inventory the supplied evidence

- Read `starting-galaxy-workflow.gxwf.yml` as the source of truth.
- Use `summary-galaxy-workflow.json` when supplied, but reconcile it against the workflow and derive the same facts directly when it is absent.
- Discover each optional input explicitly. Preserve supplied tests and companion documents as edit baselines. Initialize `open-requirements.ledger.yml` with `entries: []` when no ledger is supplied.
- Record which inputs were present in the report. Never describe an absent artifact as inspected.

### 2. Apply the pinned IWC policy

Read the bundled IWC review prompt and apply every applicable check. Treat its pinned revision as the upstream policy source for this run, record that revision in the report, and never imply that newer policy was evaluated.

For every checklist item, record exactly one status:

- `pass` — evidence shows the item was already satisfied;
- `changed` — this run made a supported correction;
- `needs-user-input` — a consequential choice lacks evidence; or
- `not-applicable` — with a specific reason.

Inspect the workflow metadata and annotation, input/output and promoted-output labels, folder/file naming recommendation, genericity, README, changelog, Dockstore paths and creators, workflow/test label agreement, and test-data placement. Cite the file and field or section used for every conclusion.

### 3. Make only supported edits

Apply clear mechanical corrections: human-readable names, descriptive annotations grounded in the graph, label synchronization, companion paths, and removal of obviously sample-specific naming. Generalize a hard-coded sample value or path only when its role is unambiguous and an input can replace it without changing scientific behavior.

Preserve unrelated regions byte-for-byte where practical. Do not change tool identity or version, graph topology, scientifically meaningful defaults, test strength, or assertions merely to satisfy style guidance.

Never invent creators, ORCIDs, citations, license choices, release history, scientific purpose, reference-data strategy, or durable URLs. Use `iwc-publication-context` only as supplied evidence. When evidence is missing, leave the relevant value unchanged or visibly unresolved, set the checklist item to `needs-user-input`, and append a focused ledger entry saying what decision or evidence would resolve it.

### 4. Keep the workflow and test coherent

When a supplied test exists, preserve every job input and assertion except for the smallest change required by a supported interface-label edit. Update test keys in the same run as the corresponding workflow labels. Do not weaken assertions or manufacture expected outputs.

When no test exists, emit no `galaxy-workflow-test` artifact. Record `needs-user-input` for the missing test and point to the existing Galaxy test-planning and [[implement-galaxy-workflow-test]] path. An absent optional output is an expected result here, not a successful test claim.

### 5. Prepare ordinary IWC companions

- Create or update a README from evidenced workflow purpose, valid inputs, and expected outputs. Preserve useful supplied material. State unknown comparisons or tutorial links as unresolved; do not invent them.
- Create or update the changelog, preserving existing history and adding only an evidence-backed entry. If the release cannot be chosen safely, make that a ledger item rather than fabricating a version history.
- Create or update `.dockstore.yml` and align its paths with the emitted filenames. Preserve existing metadata and copy creator information only from workflow metadata or supplied context. Missing authorship is unresolved, not a license to guess.

### 6. Report and hand off

Write `iwc-maturation-report.md` with the pinned IWC source revisions from the bundled references, supplied-input inventory, per-item status and evidence, concise before/after descriptions, unresolved ledger ids, and the exact emitted files. End with an explicit statement that this Mold did not run terminal validation or workflow tests and did not create or update a GitHub pull request.

The downstream path owns [[validate-galaxy-workflow]], [[run-workflow-test]], repair/retest, and publication automation.

## Non-goals

- No Planemo execution or validation claim.
- No new expected test result or weakened assertion.
- No tool, topology, or scientific redesign without explicit evidence.
- No branch, pull request, comment, label, or other GitHub mutation.
- No publication-readiness or canonical-IWC claim.
