---
type: mold
name: review-galaxy-workflow
axis: source-specific
source: galaxy
tags:
  - source/galaxy
  - lifecycle/review
status: draft
created: 2026-09-12
revised: 2026-09-12
revision: 1
summary: "Apply the pinned upstream IWC review policy to one Galaxy workflow or pull request and emit one evidenced advisory Markdown review."
input_artifacts:
  - id: starting-galaxy-workflow
    role: galaxy-workflow-subject
    description: "The normalized concrete gxformat2 workflow under review, as emitted by [[summarize-galaxy-workflow]]; the reviewed subject in the standard pipeline."
  - id: galaxy-workflow
    role: galaxy-workflow-subject
    description: "The equivalent concrete gxformat2 workflow when a Foundry run supplies one directly instead of routing through the summarizer."
  - id: summary-galaxy-workflow
    description: "Structured summary of the reviewed workflow: inputs, outputs, tool ids and versions, defaults, connections, labels, annotations, and existing tests. Read it instead of re-extracting them."
  - id: galaxy-workflow-validation-result
    description: "Terminal structural validation handoff from [[validate-galaxy-workflow]]: the command run, its status, and its diagnostics. Cite it; never restate a validation claim this Mold did not receive."
  - id: workflow-test-result
    description: "Planemo execution handoff from [[run-workflow-test]], including its honest test-definition-missing and not-run states. Cite its status; never infer a passing test from inspection."
  - id: galaxy-workflow-test
    optional: true
    description: "The workflow's test file when one exists; absent when the submission ships no test, which is a reviewable finding rather than an error."
  - id: galaxy-workflow-pr-context
    optional: true
    description: "Harness-supplied pull-request context: repository, pull request number, title and body, base and head SHAs, changed-file list, base-to-head diff, and the complete relevant files."
  - id: iwc-dockstore-metadata
    optional: true
    description: "The submission's `.dockstore.yml` when present; it names the primary Galaxy descriptor under the IWC-Lab repository profile, which may be a `.gxwf.yml` file."
  - id: iwc-comparison-notes
    optional: true
    description: "Existing structural diff from [[compare-against-iwc-exemplar]] when a Foundry run already produced one. Consume it; never rerun that comparison inside this Mold."
  - id: open-requirements-ledger
    optional: true
    description: "Carried obligations ledger [[open-requirements-ledger]] when a Foundry run supplied one; read-only here, used to report unresolved intent and surrendered work."
output_artifacts:
  - id: galaxy-workflow-review
    kind: markdown
    default_filename: galaxy-workflow-review.md
    description: "Advisory IWC-policy review of one Galaxy workflow pull-request subject, citing structural validation, Planemo test evidence, and optional Foundry context."
references:
  - kind: prompt
    ref: "[[workflow-pr-review-command]]"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: corpus-observed
    purpose: "Apply the pinned upstream IWC review command as the primary checklist and procedure, adapting repository terminology without changing policy."
  - kind: schema
    ref: "[[summary-galaxy-workflow]]"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: cast-validated
    purpose: "Read the supplied workflow summary rather than re-deriving inputs, outputs, tool pins, defaults, connections, labels, and existing tests."
  - kind: research
    ref: "[[iwc-test-data-conventions]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Judge test labels, durable remote fixtures, creator identifiers, and companion-file naming against current IWC conventions."
    trigger: "When assessing the submission's test file, test-data references, creator metadata, or release entry."
  - kind: research
    ref: "[[galaxy-workflow-testability-design]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Distinguish a genuine workflow-interface or test-addressing defect from a stylistic preference when a label and a test key disagree."
    trigger: "When an input, promoted output, collection identifier, or workflow-output label does not agree with the supplied test."
  - kind: research
    ref: "[[iwc-shortcuts-anti-patterns]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Recognize corpus-observed shortcuts so a finding cites an observed IWC anti-pattern rather than reviewer taste."
    trigger: "When a structural choice looks like a shortcut and the finding needs corpus grounding before it is raised as required."
  - kind: research
    ref: "[[open-requirements-ledger]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: hypothesis
    purpose: "Read a supplied ledger's open and surrendered entries into the clearly labeled Foundry context section without treating their absence as an IWC failure."
    trigger: "When the harness supplied an open-requirements ledger and the review needs to report unresolved intent or surrendered work as Foundry context."
    verification: "Run the with-foundry-context and without-foundry-context scenarios; confirm the labeled section appears in one, is omitted or explicitly stated absent in the other, and that the IWC checklist verdicts are identical between them."
related_molds:
  - "[[summarize-galaxy-workflow]]"
  - "[[validate-galaxy-workflow]]"
  - "[[run-workflow-test]]"
  - "[[compare-against-iwc-exemplar]]"
  - "[[mature-galaxy-workflow-for-iwc]]"
related_notes:
  - "[[workflow-pr-review-command]]"
  - "[[open-requirements-ledger]]"
---

# review-galaxy-workflow

Review one Galaxy workflow submission under the pinned upstream IWC review policy and return one advisory Markdown review. This Mold reads evidence; it does not produce or change a workflow, and it cannot approve, push, comment, label, mark ready, or merge.

## Procedure

### 1. Establish the reviewed subject and its evidence

- Read the concrete workflow — the normalized `starting-galaxy-workflow.gxwf.yml`, or the `galaxy-workflow.gxwf.yml` a Foundry run supplied directly.
- Read `summary-galaxy-workflow.json` for inputs, outputs, tool ids and versions, tool state, connections, labels, annotations, and existing tests. Do not re-extract what the summary already carries.
- Read `galaxy-workflow-validation-result.json` and `workflow-test-result.json`. Record each status verbatim. **Never run `gxwf validate` or `planemo test` inside this Mold**, and never upgrade an unverified item to a pass on the strength of inspection.
- Inventory the optional inputs and record which ones were present. Never describe an absent artifact as inspected.

### 2. Select the repository profile

- **IWC**: the primary descriptor is the native `.ga` workflow; apply the upstream checklist to it.
- **IWC-Lab**: the primary Galaxy descriptor is the one named by the submission's `.dockstore.yml`, which may be a `.gxwf.yml` file. Apply the same descriptor-level checks to that file.
- When no `.dockstore.yml` was supplied, state which profile was assumed and why.

### 3. Apply the pinned IWC policy

Read the bundled review command and work its checklist in order. Adapt repository terminology where the profile requires it; do not silently add, drop, or soften a policy item. For each applicable item record exactly one of `pass`, `needs attention`, `not applicable`, or `unverified`, with file and field evidence. Prefer the deterministic evidence from step 1 wherever it answers a checklist question — cite the Planemo result rather than concluding from inspection that a test passed.

### 4. Add Foundry context only when it was supplied

When `iwc-comparison-notes`, an `open-requirements-ledger`, or source and design handoffs are present, add a clearly labeled **Foundry context** section covering unresolved intent, surrendered or dropped work, and test strength. When they are absent, omit the section or state that no Foundry context was supplied. **Their absence is never an IWC finding.** Do not rerun [[compare-against-iwc-exemplar]]; consume its existing output.

### 5. Write the review

Emit `galaxy-workflow-review.md` with, in order:

1. reviewed repository, pull request, head SHA, workflow directory, repository profile, and prompt provenance — name the bundled prompt reference and the hash recorded for it in this cast's provenance record, and make no claim about upstream policy newer than that pin;
2. the validation result and the Planemo test result, quoted as statuses rather than as conclusions;
3. the applicable IWC checklist, one status and its evidence per item;
4. the Foundry context section, when one was supplied;
5. required fixes, separated from optional improvements, separated from evidence that was unavailable; and
6. exactly one advisory recommendation: `approve`, `request changes`, or `needs discussion`.

## Non-goals

- No `gxwf validate` or `planemo test` execution, and no re-derivation of the summary.
- No workflow, test, or companion-file edit, and no changeset. An accepted edit is [[mature-galaxy-workflow-for-iwc]]'s business, routed through [[apply-galaxy-workflow-changeset]].
- No GitHub mutation of any kind — no review, approval, comment, label, push, ready-for-review, or merge.
- No JSON report, no stable finding ids, and no freshness claim about a correctly pinned prompt.
