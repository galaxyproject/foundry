---
type: research
title: "Galaxy workflow invocation failure reference"
tags:
  - target/galaxy
status: draft
created: 2026-05-02
revised: 2026-09-26
revision: 2
related_notes:
  - "[[galaxy-tool-job-failure-reference]]"
  - "[[planemo-workflow-test-architecture]]"
  - "[[galaxy-collection-semantics]]"
related_molds:
  - "[[run-workflow-test]]"
  - "[[debug-galaxy-workflow-output]]"
  - "[[validate-galaxy-workflow]]"
sources:
  - "https://github.com/galaxyproject/galaxy/blob/a63da1dfd1960360f4aa2fddc6a75396954d750a/lib/galaxy/schema/invocation.py"
  - "https://github.com/galaxyproject/galaxy/blob/a63da1dfd1960360f4aa2fddc6a75396954d750a/lib/galaxy/workflow/run.py"
  - "https://github.com/galaxyproject/galaxy/blob/a63da1dfd1960360f4aa2fddc6a75396954d750a/lib/galaxy/workflow/modules.py"
  - "https://github.com/galaxyproject/galaxy/blob/a63da1dfd1960360f4aa2fddc6a75396954d750a/lib/galaxy/model/__init__.py"
  - "https://github.com/galaxyproject/galaxy/blob/a63da1dfd1960360f4aa2fddc6a75396954d750a/lib/galaxy/webapps/galaxy/api/workflows.py"
  - "https://github.com/galaxyproject/galaxy/blob/a63da1dfd1960360f4aa2fddc6a75396954d750a/lib/galaxy/webapps/galaxy/services/invocations.py"
  - "https://github.com/galaxyproject/galaxy/blob/a63da1dfd1960360f4aa2fddc6a75396954d750a/lib/galaxy/managers/jobs.py"
  - "https://github.com/galaxyproject/planemo/blob/eacf90419af1189b6b73d55a09a2651933a09b41/planemo/galaxy/activity.py"
  - "https://github.com/galaxyproject/planemo/blob/eacf90419af1189b6b73d55a09a2651933a09b41/planemo/runnable.py"
  - "https://github.com/galaxyproject/planemo/blob/eacf90419af1189b6b73d55a09a2651933a09b41/planemo/reports/report_markdown.tpl"
summary: "Reference for Galaxy workflow invocation states, messages, failure reasons, and invocation API surfaces."
---

# Galaxy workflow invocation failure reference

A workflow invocation records Galaxy's progress in scheduling a workflow. Its jobs record execution of the tools. A `scheduled` invocation has finished scheduling, and a `completed` invocation has terminal jobs, but neither state proves that the jobs succeeded or the outputs passed their tests.

For a failed workflow test, preserve the invocation state and messages alongside job states and output problems. Tool exit codes, streams, and structured job messages are covered in [[galaxy-tool-job-failure-reference]]. [[planemo-workflow-test-architecture]] describes how Planemo collects the run evidence, and [[debug-galaxy-workflow-output]] uses it to classify failures before recommending repairs.

## Retrieve the failure evidence

Start with the structured Planemo test result and its invocation and history IDs. If the run failed before Galaxy created an invocation, preserve the API error or staging error instead. An absent invocation ID is not an invocation failure reason.

For an existing invocation, retrieve:

1. `GET /api/invocations/{invocation_id}?step_details=true` for state, messages, step jobs, and registered outputs.
2. `GET /api/invocations/{invocation_id}/jobs_summary` for counts by job state.
3. Full details for the failing job IDs with `GET /api/jobs/{job_id}?full=true`.

For example, with a Galaxy URL, a user API key, and an encoded invocation ID:

```bash
curl --fail --silent --show-error \
  -H "x-api-key: $GALAXY_API_KEY" \
  "$GALAXY_URL/api/invocations/$INVOCATION_ID?step_details=true" \
  > invocation.json
curl --fail --silent --show-error \
  -H "x-api-key: $GALAXY_API_KEY" \
  "$GALAXY_URL/api/invocations/$INVOCATION_ID/jobs_summary" \
  > invocation-jobs-summary.json
```

Set `GALAXY_URL` to the server base URL without a trailing slash. These requests inspect an existing run. The endpoint contracts below were checked against the pinned Galaxy source in this page's sources, not every deployed Galaxy version.

## Invocation and step states

| Invocation state | Meaning for diagnosis |
|---|---|
| `new` | Newly created invocation awaiting scheduling. |
| `requires_materialization` | Inputs need materialization before scheduling can continue. This is a waiting state, not itself a failure. |
| `ready` | Ready for another scheduling iteration. |
| `scheduled` | All steps have been scheduled. Tool jobs can still be running or have failed. |
| `cancelling` | Cancellation requested. The scheduler will cancel jobs and subworkflow invocations. |
| `cancelled` | Invocation cancelled. Inspect cancellation messages. |
| `failed` | Invocation failed during scheduling or evaluation. Inspect messages and upstream jobs or inputs. |
| `completed` | All jobs reached terminal states. Those states include `ok`, `error`, `deleted`, `skipped`, `paused`, and `stopped`. |

Completion is distinct from successful execution. Inspect the job-state counts even when the invocation is `completed`, then check the expected outputs and assertions. Older servers may expose `scheduled` without the newer completion tracking.

Ordinary invocation step states are `new`, `ready`, and `scheduled`. They describe scheduling, not tool execution. The deprecated `legacy_job_state=true` option substitutes job state and can return one step entry per mapped job. It can also show incomplete information during partial scheduling. Keep the default serialization for tracing workflow steps, and inspect each step's `jobs` for execution states.

## Structured invocation messages

The `messages` list contains failure, cancellation, and warning records. Use the `reason` and its associated IDs to retrieve evidence. A missing free-text explanation does not mean there is no diagnosable failure.

| Reason | Category | Evidence to inspect |
|---|---|---|
| `dataset_failed` | Failure | `hda_id`, affected step, and optional dependent step. Inspect dataset state and the producing job or materialization failure. |
| `collection_failed` | Failure | `hdca_id` and dependent step. Inspect collection population and member jobs. |
| `job_failed` | Failure | `job_id` and dependent step. Fetch full job detail. This reason identifies a dependency failure, not every failed job in a workflow. |
| `output_not_found` | Failure | `output_name` and dependent step. A required step output could not be resolved. Check the connection and producer. |
| `expression_evaluation_failed` | Failure | Affected step. Check expressions, conditions, or `pick_value` selection requirements. Detailed expression errors can be withheld. |
| `when_not_boolean` | Failure | Affected step and `details`. The `when` result was not a boolean. |
| `unexpected_failure` | Failure | Optional affected step and `details`. If the record lacks detail, an administrator may need scheduler logs. |
| `workflow_parameter_invalid` | Failure | Parameter input step and validator `details`. Compare the supplied value with the workflow input constraints. |
| `step_input_deleted` | Failure | `hda_id` or `hdca_id`, affected step, and `details`. A referenced dataset or collection was deleted. |
| `history_deleted` | Cancellation | `history_id`. The invocation history was deleted. |
| `user_request` | Cancellation | Cancellation was requested by the user or API. |
| `cancelled_on_review` | Cancellation | Affected pause step. Review rejected continuation. |
| `workflow_output_not_found` | Warning | Affected step and `output_name`. A declared workflow output was not registered. Check its producer and output declaration. |

`output_not_found` is an evaluation failure. `workflow_output_not_found` is a warning about a declared workflow output. A warning alone does not fail the invocation, but a test requiring that output can still fail. Check optional or conditional output behavior before assuming a tool failed.

Galaxy deliberately omits potentially sensitive exception or expression text on some `unexpected_failure` and `expression_evaluation_failed` paths. Other paths provide safe `details`. Preserve the structured record and request server logs when needed instead of inferring the missing explanation.

### Match message steps to invocation steps

Message `workflow_step_id` and `dependent_workflow_step_id` identify integer workflow step indices. Match them to the invocation step's `order_index` within the relevant workflow. They are different from the encoded workflow database ID also named `workflow_step_id` in a step response.

An invocation step's encoded `id` is the value accepted by the step API. Its `job_id` identifies a single job when present, while `jobs` includes mapped jobs with `step_details=true`. For a subworkflow, follow `subworkflow_invocation_id` to retrieve the nested invocation. The message's `workflow_step_index_path` supplies enclosing subworkflow context and excludes the failing step itself. Preserve the path along with the message instead of treating its step index as a top-level step.

## Invocation API reference

Paths below are relative to the Galaxy server URL. IDs in paths are encoded API IDs.

| Method and path | Result or action |
|---|---|
| `GET /api/invocations/{invocation_id}` | Invocation state, messages, inputs, registered outputs, output values, and steps. |
| `GET /api/invocations/{invocation_id}?step_details=true` | Adds step jobs, outputs, and output collections. |
| `GET /api/invocations/steps/{step_id}` | Detail for one invocation step. |
| `GET /api/invocations/{invocation_id}/steps/{step_id}` | Alias of the preceding endpoint. It ignores `invocation_id`, so the path does not establish step membership. |
| `GET /api/invocations/{invocation_id}/jobs_summary` | Aggregate job counts in `states` and a `populated_state`. |
| `GET /api/invocations/{invocation_id}/step_jobs_summary` | Job-source summaries, including mapped job groups and recursive subworkflow jobs. |
| `GET /api/invocations/{invocation_id}/completion` | Completion time, final job-state summary, and executed completion hooks. Returns JSON `null` when there is no completion record. |
| `GET /api/invocations/{invocation_id}/report` | Generated invocation report. Keep raw messages and job records as diagnostic evidence. |
| `DELETE /api/invocations/{invocation_id}` | Requests cancellation. This changes the run. |
| `PUT /api/invocations/{invocation_id}/steps/{step_id}` | Sets pause/review action using `{"action": true}` to proceed or `{"action": false}` to reject continuation. This changes the run. |

Workflow aliases under `/api/workflows/{workflow_id}/invocations/...` also exist. Prefer the invocation paths when the invocation ID is known.

Despite its name, `step_jobs_summary` is not a dictionary keyed by workflow step index. Each entry's `model` identifies the kind of object summarized, and `id` belongs to that kind. Use step details to associate a `Job` or `ImplicitCollectionJobs` summary with the workflow step. A mapped step can have many jobs, and an aggregate state cannot identify which collection member failed.

## Diagnostic pitfalls

- **A downstream message may describe an upstream defect.** `dataset_failed`, `collection_failed`, and `job_failed` can identify the consuming step. Follow the dependent step or resource ID back to the producer before changing that consumer.
- **A waiting invocation is not automatically broken.** For `ready` or `requires_materialization`, inspect inputs, jobs, and pause actions. Preserve timeout duration if polling ends without a terminal result.
- **Successful scheduling does not validate output content.** Inspect job states, collection population, registered output labels, and assertion failures independently. See [[galaxy-collection-semantics]] for collection shape and member diagnostics.
- **One step is not necessarily one job.** Preserve failed member jobs for mapped collections and nested invocation IDs for subworkflows. Do not collapse them into a single top-level step state.
- **Missing completion data does not prove failure.** A `null` completion response means no record exists. An older server may not implement the endpoint at all. Use invocation and job states to diagnose the run.

## Planemo evidence and version limits

Planemo 0.75.47 collects invocation messages in `invocation_details`. In its JSON test report, the path is `tests[].data.invocation_details.details.messages`. Its Markdown report template also renders those messages.

Preserve `tool_test_output.json`, other reports when generated, and the Galaxy and Planemo versions. Start with the test's `invocation_details`, `execution_problem`, and `output_problems` rather than a terminal summary alone. Planemo's success check combines history state with invocation state and accepts both `scheduled` and `completed` as successful scheduling states. It does not make either invocation state proof of passing output assertions.

A staging or execution exception can still leave incomplete invocation details. Missing-output errors can come from label drift, a missing workflow output declaration, conditional absence, failed jobs, or a download problem. Follow up through Galaxy APIs when the collected artifacts lack the job, collection, or nested invocation evidence needed to distinguish them.

The state and endpoint definitions above describe the pinned Galaxy source. No live run was used to verify every message reason, collection mapping, or subworkflow representation. Check the deployed server's responses before relying on completion tracking or a particular report layout.
