---
type: mold
name: run-workflow-test
axis: generic
tags:
  - mold
status: reviewed
created: 2026-04-30
revised: 2026-07-24
revision: 6
ai_generated: true
summary: "Execute a workflow's tests via Planemo; emit structured pass/fail and outputs."
related_notes:
  - "[[tests-format]]"
output_artifacts:
  - id: workflow-test-result
    kind: json
    default_filename: workflow-test-result.json
    description: "Structured pass/fail plus captured evidence — Planemo result, invocation/history/workflow ids, artifact paths, Galaxy mode, and (on failure) the observed modality and next reference surface — for debug-galaxy-workflow-output."
references:
  - kind: schema
    ref: "[[tests-format]]"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: corpus-observed
    purpose: "Validate Galaxy workflow test files before starting a Planemo or Galaxy-backed execution."
  - kind: cli-command
    ref: "[[validate-tests]]"
    used_at: runtime
    load: on-demand
    mode: sidecar
    evidence: corpus-observed
    purpose: "Run static schema and workflow-label checks before expensive workflow execution."
    trigger: "Before invoking Planemo when a Galaxy workflow test file is present."
  - kind: cli-tool
    ref: "[[planemo]]"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: corpus-observed
    purpose: "Runtime that executes the Galaxy or CWL workflow test; install before driving the harness."
  - kind: research
    ref: "[[planemo-asserts-idioms]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Interpret assertion failures and choose the right fast inner-loop command before full reruns."
    trigger: "When a workflow test file exists and the task is to run, iterate, or classify its test assertions."
  - kind: research
    ref: "[[planemo-workflow-test-architecture]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Run workflow tests while preserving Planemo structured artifacts, Galaxy mode, invocation id, history id, and API follow-up context."
    trigger: "When choosing between managed Galaxy, external Galaxy, full test runs, existing invocation checks, or direct workflow runs."
  - kind: research
    ref: "[[galaxy-workflow-invocation-failure-reference]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Preserve invocation identifiers and state summaries needed to inspect workflow-level runtime failures after Planemo returns."
    trigger: "When Planemo reports a failed, cancelled, missing-output, or ambiguous workflow invocation result."
---
# run-workflow-test

Execute an assembled workflow's test file via [[planemo]] and emit a structured pass/fail with the artifacts a debug pass needs. One invocation runs the test once, captures the evidence, and — on failure — classifies the failure modality and names the next reference surface to inspect. It does not repair anything; that is [[debug-galaxy-workflow-output]]'s job.

## Sequence

1. **Validate before running.** When a test file is present, run [[validate-tests]] for the static schema and workflow-label checks first. A run is expensive; do not spend one on a test file that fails static validation.
2. **Pick the Galaxy mode.** Run against a Planemo-managed Galaxy or an existing/external Galaxy. **Planemo-managed** is the default and needs no pre-provisioned server: `planemo test` bootstraps its own Galaxy and installs the workflow's tools from the Tool Shed/conda — so the absence of a running Galaxy is not a reason to skip the run. Use an existing/external Galaxy only when you deliberately want to target one (shared instance, pre-installed heavy tools/reference data, specific credentials). The real cost of the managed path is install/runtime weight (large tools or multi-GB reference databases), which is a deliberate deferral, not an impossibility. Record which mode was used, how tools, workflows, and test data were staged, and the URLs or API credentials a follow-up inspection would need. The choice and its consequences are guided by [[planemo-workflow-test-architecture]].
3. **Do not pin a Galaxy version.** Leave `--galaxy_branch` off the command unless the user or the harness supplied a specific branch, and never guess a `release_*` value — Planemo's default targets the newest Galaxy, which is the only version guaranteed to understand every construct a freshly authored workflow can contain. If a branch was supplied, record it in the output so a later failure can be read against it.
4. **Run and capture.** Drive `planemo test` with structured output enabled. Preserve the invocation id, history id, workflow id, the Planemo structured result, and any test-output artifact paths — these are the inputs the debug Mold consumes.
5. **Classify on failure.** When the run exits non-zero or reports failed assertions, failed jobs, a failed invocation, missing outputs, or upload/staging problems, identify the observed failure modality and the single next reference surface to open: Planemo result, Galaxy job API, Galaxy invocation API, history contents, or the test assertion report. Use [[planemo-asserts-idioms]] to read assertion failures and [[galaxy-workflow-invocation-failure-reference]] to preserve invocation identifiers and state.
6. **Hand off.** Emit the structured summary — green, or red with modality + captured artifacts + the named next surface — for [[debug-galaxy-workflow-output]].

Keep this Mold's output a faithful record of what happened, not a diagnosis. Mislabeling a staging failure as an assertion failure here sends the debug pass to the wrong reference surface.
