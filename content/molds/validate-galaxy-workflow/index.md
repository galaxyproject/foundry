---
type: mold
name: validate-galaxy-workflow
axis: target-specific
target: galaxy
tags:
  - mold
  - target/galaxy
status: reviewed
created: 2026-05-02
revised: 2026-07-24
revision: 5
ai_generated: true
summary: "Run terminal gxwf validation on an assembled Galaxy workflow and classify workflow-level failures."
input_artifacts:
  - id: galaxy-workflow
    description: "Concrete gxformat2 workflow to validate — the loop-endstate `galaxy-workflow.gxwf.yml` from [[advance-galaxy-draft-step]] (`class: GalaxyWorkflow`); the assembled build result terminal gxwf validation runs against."
references:
  - kind: cli-command
    ref: "[[gxwf validate]]"
    used_at: runtime
    load: on-demand
    mode: sidecar
    evidence: hypothesis
    purpose: "Validate the assembled gxformat2 workflow before runtime testing."
    trigger: "After all Galaxy steps and workflow tests have been assembled."
    verification: "Run the cast skill on a complete IWC-derived workflow and confirm terminal validation findings are separated from runtime test failures."
  - kind: research
    ref: "[[galaxy-workflow-testability-design]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Classify validation or pre-test findings that indicate missing labels, omitted workflow outputs, or untestable checkpoint structure."
    trigger: "When terminal validation passes but workflow-level outputs, labels, or collection shapes look likely to break future workflow tests."
  - kind: research
    ref: "[[galaxy-workflow-invocation-failure-reference]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Keep static workflow validation findings distinct from Galaxy invocation/runtime failure surfaces."
    trigger: "When a workflow passes gxwf validation but still has likely runtime risks around invocation scheduling, outputs, conditionals, or collection population."
---

# validate-galaxy-workflow

Validate the assembled Galaxy workflow before runtime testing. The Mold owns the terminal validation pass: run [[gxwf validate]], classify workflow-level diagnostics, and route failures back to the responsible authoring phase when possible.

This is separate from [[advance-galaxy-draft-step]] (which runs `gxwf draft-validate --concrete` inside the per-step loop) because terminal validation no longer has only one fresh step in scope and should reason over cross-step workflow structure.
