# cwl-summary-to-galaxy-data-flow eval

Evaluation plan for the `cwl-summary-to-galaxy-data-flow` Mold. This file is the
**abstract oracle**: properties any data-flow brief must satisfy, independent of
fixture, with explicit guardrails against quietly inventing facts that aren't in
the source CWL. Concrete fixtures and their expected values live in
`scenarios.md`; the oracle here is applied to whatever a scenario produces.
Properties are tagged by bucket:

- **fidelity** — does the brief faithfully reflect the source CWL without silent loss or fabrication?
- **handoff** — can the next Mold downstream consume the brief without re-deriving the source?

## Property: secondaryFiles plumbing visible

- bucket: fidelity
- check: llm-judged
- assertion: when a step input or workflow output requires `secondaryFiles`, the
  draft either keeps the required secondaryFiles traveling with their primary
  file across steps, or flags the gap as an open question. They must not silently
  vanish between nodes.

## Property: no invented Tool Shed IDs

- bucket: fidelity
- check: llm-judged
- assertion: each CWL `CommandLineTool` appears as a placeholder with enough
  source context (baseCommand, key inputs, expected outputs) for later tool
  discovery. Concrete Tool Shed IDs, owners, or version revisions must not be
  fabricated.

## Property: pickValue is not silently dropped

- bucket: fidelity
- check: llm-judged
- assertion: every `pickValue` marker on a workflow output or step input appears
  in the draft — as a native `pick_value` workflow step, a sibling-workflow note,
  or an open question. A draft that omits the marker fails even if it looks
  plausible otherwise.

## Property: ExpressionTool steps surface as placeholders

- bucket: fidelity
- check: llm-judged
- assertion: each `ExpressionTool` step appears as a flagged placeholder with the
  source expression intent noted for review. They must not be absorbed silently
  into wiring, since Galaxy has no native equivalent.

## Property: template Mold can consume the draft

- bucket: handoff
- check: llm-judged
- assertion: `cwl-summary-to-galaxy-template` can turn the draft into workflow
  inputs, placeholder steps, rough connections, and TODO notes without asking for
  missing basics such as step names, source CWL tools, or open branching
  questions.
