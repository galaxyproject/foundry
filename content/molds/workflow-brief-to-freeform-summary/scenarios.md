# Brief-to-Galaxy entry scenarios

## Case: hand-authored brief passes the static gate but still needs review and preflight

- fixture: `content/molds/freeform-summary-to-workflow-brief/examples/interview/workflow-brief.md`
- expect: check-workflow-brief exits 0. With recorded review and current successful preflight, projection enters the existing design chain. Without either, stop. Every phase preserves the brief's bytes and excludes alignment and variant calling.

## Case: either category of blocker prevents projection and design

- fixture: `content/molds/freeform-summary-to-workflow-brief/examples/blocked/workflow-brief.md`
- expect: Structural validation exits 0; the readiness command exits 4 with both categories of blocker. Do not emit a derived summary or design artifact, and leave the brief unchanged.

## Case: source evidence contains more than the selected scope

- fixture: `content/molds/nextflow-summary-to-workflow-brief/examples/workflow-brief.md`
- expect: The projection keeps read quality reporting and excludes trimming and aggregate reporting. Links to the source summary retain evidence; the agent makes no Galaxy choices until the downstream design tier, and never widens or edits the brief.
