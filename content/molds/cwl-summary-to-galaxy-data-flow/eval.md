# cwl-summary-to-galaxy-data-flow eval

Evaluation plan for the `cwl-summary-to-galaxy-data-flow` Mold. These cases look for a useful Galaxy-facing draft of data movement and unresolved operations, with explicit guardrails against quietly inventing facts that aren't in the source CWL.

## Case: secondaryFiles plumbing visible

- bucket: fidelity
- check: llm-judged
- fixture: a summary where at least one step input or workflow output requires `secondaryFiles`.
- expectation: draft either keeps required secondaryFiles traveling with their primary file across steps, or flags the gap as an open question. They must not silently vanish between nodes.

## Case: no invented Tool Shed IDs

- bucket: fidelity
- check: llm-judged
- fixture: any non-trivial summary with multiple `CommandLineTool` steps.
- expectation: each CWL `CommandLineTool` appears as a placeholder with enough source context (baseCommand, key inputs, expected outputs) for later tool discovery. Concrete Tool Shed IDs, owners, or version revisions must not be fabricated.

## Case: pickValue is not silently dropped

- bucket: fidelity
- check: llm-judged
- fixture: a summary with `pickValue:*` on a workflow output or step input (e.g. `first_non_null`, `the_only_non_null`, `all_non_null`).
- expectation: every `pickValue` marker appears in the draft — as a native `pick_value` workflow step, a sibling-workflow note, or an open question. A draft that omits the marker fails this case even if it looks plausible otherwise.

## Case: ExpressionTool steps surface as placeholders

- bucket: fidelity
- check: llm-judged
- fixture: a summary containing at least one `ExpressionTool` step (or a subworkflow that uses one).
- expectation: each `ExpressionTool` appears as a flagged placeholder with the source expression intent noted for review. They must not be absorbed silently into wiring, since Galaxy has no native equivalent.

## Case: template Mold can consume the draft

- bucket: handoff
- check: llm-judged
- fixture: source summary, interface brief, and data-flow brief.
- expectation: `cwl-summary-to-galaxy-template` can turn the draft into workflow inputs, placeholder steps, rough connections, and TODO notes without asking for missing basics such as step names, source CWL tools, or open branching questions.
