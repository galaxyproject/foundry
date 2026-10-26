---
type: mold
name: run-workflow-test
axis: generic
tags:
  - target/galaxy
  - tool/planemo
status: reviewed
created: 2026-04-30
revised: 2026-10-26
revision: 8
summary: "Execute a workflow's tests via Planemo; emit structured pass/fail and outputs."
related_notes:
  - "[[tests-format]]"
output_artifacts:
  - id: workflow-test-result
    kind: json
    default_filename: workflow-test-result.json
    description: "Structured status plus captured evidence — Planemo result, invocation/history/workflow ids, artifact paths, Galaxy mode, and (on failure) the observed modality and next reference surface — for debug-galaxy-workflow-output. Also the faithful handoff when no test exists or none could be run."
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
    trigger: "When choosing between managed Galaxy, external Galaxy, full test runs, existing invocation checks, or direct workflow runs, or when a tool step reads a Galaxy data table."
  - kind: research
    ref: "[[galaxy-user-tool-workflow-binding]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Provision the Galaxy setting and user role that importing a workflow with an embedded `GalaxyUserTool` requires."
    trigger: "When any step of the workflow, at any subworkflow depth, has a `GalaxyUserTool` under `run:`."
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

0. **Establish the test definition.** Locate the workflow's test file before anything else. If none can be found, do not abort: emit `workflow-test-result.json` with `status: test-definition-missing`, the paths searched, and the workflow it was searched for, then stop. Emit `status: not-run` plus a `not_run_reason` instead when a test exists but cannot be executed — a static [[validate-tests]] failure, missing test data, an unavailable Galaxy, an uninstallable tool, a data-table entry the target Galaxy lacks, a timeout, or a checkout the caller has not confirmed as trusted. A downstream consumer needs to know that nothing ran; it must never have to infer it from a missing file.
1. **Validate before running.** When a test file is present, run [[validate-tests]] for the static schema and workflow-label checks first. A run is expensive; do not spend one on a test file that fails static validation.
2. **Pick the Galaxy mode.** Run against a Planemo-managed Galaxy or an existing/external Galaxy. **Planemo-managed** is the default and needs no pre-provisioned server: `planemo test` bootstraps its own Galaxy and installs the workflow's tools from the Tool Shed/conda — so the absence of a running Galaxy is not a reason to skip the run. Use an existing/external Galaxy only when you deliberately want to target one (shared instance, pre-installed heavy tools/reference data, specific credentials). The real cost of the managed path is install/runtime weight (large tools or multi-GB reference databases), which is a deliberate deferral, not an impossibility. Record which mode was used, how tools, workflows, and test data were staged, and the URLs or API credentials a follow-up inspection would need. The choice and its consequences are guided by [[planemo-workflow-test-architecture]].

   **Exception: workflows that embed user-defined tools.** If any step, at any subworkflow depth, has a `GalaxyUserTool` under `run:`, do not try the managed path. Planemo-managed Galaxy cannot run these workflows: Planemo crashes collecting the workflow's tool ids before Galaxy starts, and its test user lacks the role Galaxy requires to import an embedded tool. Instead, start a Galaxy with `planemo serve`, provision a user that can run embedded tools, and run `planemo test --engine external_galaxy` against it. [[planemo-workflow-test-architecture]] gives the commands. [[galaxy-user-tool-workflow-binding]] defines the server setting and role they provision. Record the mode as external Galaxy and say embedded tools forced it.
3. **Check data-table dependencies.** A tool step whose state selects a value from a Galaxy data table runs only where that table has a row for the value. The parsed tool model shows such a select with `options: null`, so read the table name from the `from_data_table` attribute in the tool's source, as [[planemo-workflow-test-architecture]] describes. Count only selects the step's state sets, on the conditional branch it takes. On an external Galaxy, after the workflow's tools are installed, query each table. If the table is missing or has no row for the step's value, emit `status: not-run` and name the table, the value, and the step in `not_run_reason`. A Planemo-managed Galaxy starts with empty shed data tables, so there the static finding alone decides the deferral unless the caller supplied table configuration. Provisioning the table is the caller's decision, not this Mold's.
4. **Do not pin a Galaxy version.** Leave `--galaxy_branch` off the command unless the user or the harness supplied a specific branch, and never guess a `release_*` value — Planemo's default targets the newest Galaxy, which is the only version guaranteed to understand every construct a freshly authored workflow can contain. If a branch was supplied, record it in the output so a later failure can be read against it.
5. **Run and capture.** Drive `planemo test` with structured output enabled. Preserve the invocation id, history id, workflow id, the Planemo structured result, and any test-output artifact paths — these are the inputs the debug Mold consumes.
6. **Classify on failure.** When the run exits non-zero or reports failed assertions, failed jobs, a failed invocation, missing outputs, or upload/staging problems, identify the observed failure modality and the single next reference surface to open: Planemo result, Galaxy job API, Galaxy invocation API, history contents, or the test assertion report. Use [[planemo-asserts-idioms]] to read assertion failures and [[galaxy-workflow-invocation-failure-reference]] to preserve invocation identifiers and state.
7. **Hand off.** Emit the structured summary carrying a `status` from the closed set `pass | fail | test-definition-missing | not-run` — green, or red with modality + captured artifacts + the named next surface — for [[debug-galaxy-workflow-output]]. A `test-definition-missing` or `not-run` result is never reported as a pass and never as a Planemo failure: neither carries a failure modality or a next reference surface, because nothing ran. A consumer must read those two states as *no runtime evidence*, not as a debug target.

Keep this Mold's output a faithful record of what happened, not a diagnosis. Mislabeling a staging failure as an assertion failure here sends the debug pass to the wrong reference surface.
