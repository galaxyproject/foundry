---
type: mold
name: debug-galaxy-workflow-output
axis: target-specific
target: galaxy
tags:
  - target/galaxy
status: reviewed
created: 2026-04-30
revised: 2026-10-26
revision: 6
summary: "Triage failing Galaxy run outputs; classify the failure surface and capture evidence before recommending repairs."
input_artifacts:
  - id: workflow-test-result
    description: "Structured run handoff from run-workflow-test: Planemo result, invocation/job/artifact context, and the observed failure modality."
output_artifacts:
  - id: workflow-debug-report
    kind: markdown
    default_filename: workflow-debug-report.md
    description: "Failure-surface classification with captured import/job/invocation/collection/assertion evidence and a recommended next step or reference-gap follow-up."
references:
  - kind: research
    ref: "[[planemo-asserts-idioms]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Classify whether a failure is an assertion-choice problem, tolerance problem, or real workflow-output regression."
    trigger: "When Planemo reports output assertion failures or generated tests are too strict/too weak."
  - kind: research
    ref: "[[iwc-shortcuts-anti-patterns]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Decide whether a proposed debug fix aligns with accepted IWC testing shortcuts or masks a real failure."
    trigger: "When debugging suggests weakening assertions, widening deltas, switching to existence checks, or changing output labels."
  - kind: research
    ref: "[[galaxy-collection-semantics]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Diagnose collection shape, mapping, reduction, and element-identifier mismatches in failed Galaxy runs."
    trigger: "When a failing output is a collection, a mapped output, or an unexpectedly nested/flattened structure."
  - kind: research
    ref: "[[nextflow-operators-to-galaxy-collection-recipes]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Trace collection output failures back to possibly lossy operator translations."
    trigger: "When debugging wrong nesting, missing elements, branch merges, bad joins, or gather/reduction mismatches."
  - kind: research
    ref: "[[galaxy-tool-job-failure-reference]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Interpret Galaxy job-level failure evidence including stdio rules, exit code, job messages, and output dataset state."
    trigger: "When a failed workflow test includes errored jobs, tool stderr/stdout, non-zero exit codes, or red output datasets."
  - kind: research
    ref: "[[galaxy-workflow-invocation-failure-reference]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Interpret Galaxy invocation-level failure evidence including invocation state, structured messages, and step job summaries."
    trigger: "When a failed workflow test has invocation failure, missing workflow outputs, cancelled/paused steps, subworkflow failures, or collection population errors."
  - kind: research
    ref: "[[planemo-workflow-test-architecture]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Locate which Planemo artifact or Galaxy API surface preserves the failure evidence."
    trigger: "When Planemo output is ambiguous, structured test JSON is available or missing because Galaxy rejected the workflow import, or rerunning can be avoided by inspecting an existing invocation."
---
# debug-galaxy-workflow-output

Triage a failing Galaxy workflow test. Take the structured handoff from [[run-workflow-test]], classify the failure surface before proposing any repair, and capture the reference evidence the surface requires. When the failure cannot be classified from existing references, recommend a focused follow-up rather than converting uncertainty into a guessed fix.

Classify before repairing. A red run can be a workflow import rejection, a tool/job failure, a workflow invocation failure, a collection-output mismatch, a missing workflow output, or an assertion mismatch—and each routes to a different reference surface and a different fix. Locate where the evidence lives first ([[planemo-workflow-test-architecture]]).

## Sequence

1. **Classify the first failure surface.** From the run's structured result, decide whether the first failure is a workflow import rejection, a tool/job failure, a workflow invocation failure, a collection-output mismatch, a missing workflow output, or an assertion mismatch. Check import first: when the handoff reports `failure_modality: workflow-import-rejected`, or carries no workflow, history, or invocation id because Galaxy refused the workflow, no later surface exists to inspect. Classify before proposing repairs.
2. **Capture import-rejection evidence.** When Galaxy rejected the workflow import, record the HTTP status and response body from the import request, the Galaxy server-log traceback for that request when one exists, and the Planemo terminal log. A 500 leaves a traceback. A handled 400 usually does not, and its response body carries the reason. A managed Galaxy's traceback also appears in the Planemo terminal log. An external Galaxy's appears only in its own server log. No structured Planemo output exists in this case—Planemo writes no test JSON or HTML report when the import fails ([[planemo-workflow-test-architecture]])—and steps 4–7 have nothing to inspect.
3. **Isolate an import rejection's trigger, then route it.** Bisect with small, self-contained synthetic gxformat2 workflows rather than truncating the real one. Truncation leaves dangling step references that fail with unrelated errors. Import each variant as the same user on the same server, through the same conversion Planemo used (it converts gxformat2 to a native dict client-side before upload), change one structural feature at a time, and keep a variant that imports as the passing control. Imports can leave state behind—an embedded user-defined tool is created on first import—so use distinct tool definitions per variant or a fresh server when that state could mask the trigger. Then route by what the bisection shows:
   - A minimal variant that passes the pipeline's static validation (`gxwf validate`) reproduces a 500 with an internal server traceback: an upstream Galaxy or gxformat2 defect. Record the smallest failing variant, its passing control, and the traceback as the repro. Do not reshape the workflow to dodge the defect.
   - A 400 naming a schema, validation, or lint problem, or a 500 that disappears once the variant passes static validation: a workflow-content error. Route it back to the phase that emitted the offending construct. When static validation accepted the construct Galaxy rejected, also record that validator gap as its own finding.
4. **Capture job-failure evidence.** When a job is in `error`/`failed`/`stopped`, record job id, tool id, exit code, job messages, the stdout/stderr distinction, and output dataset state per [[galaxy-tool-job-failure-reference]]; check whether the wrapper's failure semantics already explain it.
5. **Capture invocation-failure evidence.** When the invocation state or messages indicate scheduling, materialization, cancellation, conditional, or output-resolution failure, record invocation state, the structured message reason, the affected step, any subworkflow path, and the jobs summary per [[galaxy-workflow-invocation-failure-reference]]; note whether Planemo surfaced or hid the relevant Galaxy API detail.
6. **Trace collection mismatches.** When a failing output is a collection or mapped output, diagnose shape, mapping, reduction, and element-identifier mismatches with [[galaxy-collection-semantics]]; for workflows translated from Nextflow, trace wrong nesting / missing elements / bad joins back to possibly-lossy operator translations via [[nextflow-operators-to-galaxy-collection-recipes]].
7. **Read assertion failures honestly.** When the failure is an assertion, use [[planemo-asserts-idioms]] to decide whether it is an assertion-choice/tolerance problem or a real output regression. Before weakening an assertion, widening a delta, or switching to an existence check, confirm against [[iwc-shortcuts-anti-patterns]] that the relaxation is an accepted IWC shortcut and not masking a real failure.
8. **Discover reference gaps.** When the failure cannot be classified confidently from the references above, recommend a focused follow-up — reference documentation, pattern capture, API verification, or eval coverage — rather than emitting a repair recipe built on a guess.
