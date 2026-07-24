---
type: mold
name: interview-to-galaxy-workflow-changeset
axis: source-specific
source: interview
target: galaxy
tags:
  - source/interview
  - target/galaxy
status: reviewed
created: 2026-07-01
revised: 2026-07-24
revision: 2
ai_generated: true
summary: "Interview a user against an existing Galaxy workflow summary and emit a reviewable, step-anchored change-set."
input_artifacts:
  - id: summary-galaxy-workflow
    description: "Structured summary of the existing workflow from [[summarize-galaxy-workflow]]; the anchor set the change-set addresses (step labels, input labels, output names, tool_state keys)."
  - id: open-requirements-ledger
    description: "Carried obligations ledger [[open-requirements-ledger]]: read prior open entries; append requested changes the workflow cannot yet support."
output_artifacts:
  - id: galaxy-workflow-changeset
    kind: markdown
    default_filename: galaxy-workflow-changeset.md
    description: "Reviewable, ordered list of edit intents, each anchored to an existing step/input/output by label (or marked `new`), with edit kind, target, intent, and acceptance note. The human approval gate before any edits are applied."
  - id: open-requirements-ledger
    kind: yaml
    default_filename: open-requirements.ledger.yml
    description: "Updated obligations ledger: requested changes the workflow cannot support appended as open entries; prior entries this interview resolves marked resolved."
references:
  - kind: schema
    ref: "[[summary-galaxy-workflow]]"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: cast-validated
    purpose: "Input contract: read the existing-workflow summary to anchor every change-set entry to a real step/input/output."
  - kind: research
    ref: "[[open-requirements-ledger]]"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: hypothesis
    purpose: "Carry the open-requirements ledger: append requested changes the current workflow cannot support rather than inventing or dropping them, and mark resolved the ones this step closes."
    verification: "Promote after a worked run shows entries this Mold appends are consumed by apply-galaxy-workflow-changeset or a reviewer without re-derivation."
related_molds:
  - "[[summarize-galaxy-workflow]]"
  - "[[apply-galaxy-workflow-changeset]]"
  - "[[interview-to-freeform-summary]]"
related_notes:
  - "[[summary-galaxy-workflow]]"
  - "[[summarize-galaxy-workflow]]"
  - "[[apply-galaxy-workflow-changeset]]"
  - "[[open-requirements-ledger]]"
---
# interview-to-galaxy-workflow-changeset

Turn a modification interview into a **reviewable change-set** against an existing Galaxy workflow. This is the update pipeline's analogue of [[interview-to-freeform-summary]]: the harness owns the live interaction; the Mold's job is the normalized handoff. But unlike the greenfield summary, the output is *anchored to concrete steps* of a workflow that already exists — it names what to change, not what to build.

The harness owns the interaction style (interactive session, saved transcript, or custom UI). Read the [[summary-galaxy-workflow]] first so every change is expressed against real labels rather than a mental model of the workflow.

## Output: the change-set

Emit Markdown: an ordered list of edit intents. Each entry carries:

- **kind** — one of: `add-step`, `replace-tool`, `remove-step`, `change-parameter`, `add-input`, `remove-input`, `add-output` / `expose-output`, `rewire`, `relabel` / `annotate`.
- **anchor** — the existing step label, input label, output name, or `tool_state` key the edit targets, quoted from the summary; or `new` for an added element.
- **intent** — what the user wants, in their words plus the concrete target value where they gave one (e.g. a parameter's new value).
- **acceptance** — how a reviewer or a test would confirm the edit landed (a new output is present, a parameter reads the new value, a step feeds its intended consumer).

Order edits so dependencies read top-to-bottom (add a step before rewiring its consumer). The change-set is a **reviewable artifact** — the natural human approval gate before [[apply-galaxy-workflow-changeset]] touches the workflow.

## Anchor discipline

Every entry must anchor to something the summary actually contains, or be explicitly marked `new`. Do not reference a step the workflow does not have, and do not silently rename an existing anchor. If the user asks for a change the workflow cannot support as described — an operation on a step that isn't there, a parameter a tool doesn't expose, a rewire that would break the graph — record it on the [[open-requirements-ledger]] as an open entry rather than inventing an anchor or quietly dropping the request.

## Don't over-specify

- **Don't resolve tools here.** An `add-step` or `replace-tool` names the *operation and any user-given tool/version*, not a resolved Tool Shed changeset — wrapper resolution is the per-step loop's job downstream. Record vague tool intent as intent plus, if needed, an open-requirements entry.
- **Don't apply the edit.** This Mold decides *what* changes; [[apply-galaxy-workflow-changeset]] decides *how* the gxformat2 changes. Keep the two separate so the change-set stays reviewable.
- **Preserve scope.** Capture only what the interview supports. Do not fold in unrequested "while we're here" tidying — untouched regions must stay untouched, and a change-set that quietly widens scope propagates gratuitous churn downstream.
