# interview-to-galaxy-workflow-changeset eval

Abstract oracle for the change-set emitted from a modification interview against an existing workflow. Fixture-bound cases live in the pipeline's `scenarios.md`.

## Property: every entry is anchored or explicitly new

- check: llm-judged
- assertion: each change-set entry anchors to a step label, input label, output name, or `tool_state` key present in the [[summary-galaxy-workflow]], or is marked `new`. No entry references a step the workflow does not contain.

## Property: unsupported requests surface, they do not vanish or get invented

- check: llm-judged
- assertion: a requested change the workflow cannot support as described appears on the [[open-requirements-ledger]] as an open entry — never fabricated into a fake anchor and never silently dropped.

## Property: the change-set stays at intent altitude, not implementation

- check: llm-judged
- assertion: `add-step` / `replace-tool` entries name the operation and any user-given tool/version, but do not resolve a Tool Shed changeset or emit gxformat2 — wrapper resolution and workflow editing are downstream. An entry that hand-authors tool_state is out of altitude.

## Property: scope is faithful to the interview

- check: llm-judged
- assertion: every entry traces to something the user actually asked for; the change-set introduces no unrequested "while we're here" edits. Scope creep here becomes gratuitous churn in the emitted workflow.

## Property: each entry carries a checkable acceptance note

- check: llm-judged
- assertion: every entry states how the edit would be confirmed (an output present, a parameter at its new value, a step wired to its consumer), so the apply step and the regression baseline have a target.
