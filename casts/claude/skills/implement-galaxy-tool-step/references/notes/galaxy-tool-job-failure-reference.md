---
type: research
title: "Galaxy tool and job failure reference"
tags:
  - target/galaxy
status: draft
created: 2026-05-02
revised: 2026-09-26
revision: 2
related_notes:
  - "[[galaxy-workflow-invocation-failure-reference]]"
  - "[[planemo-workflow-test-architecture]]"
  - "[[galaxy-collection-semantics]]"
related_molds:
  - "[[implement-galaxy-tool-step]]"
  - "[[debug-galaxy-workflow-output]]"
sources:
  - "https://github.com/galaxyproject/galaxy/blob/a63da1dfd1960360f4aa2fddc6a75396954d750a/lib/galaxy/tool_util/parser/xml.py"
  - "https://github.com/galaxyproject/galaxy/blob/a63da1dfd1960360f4aa2fddc6a75396954d750a/lib/galaxy/tool_util/parser/stdio.py"
  - "https://github.com/galaxyproject/galaxy/blob/a63da1dfd1960360f4aa2fddc6a75396954d750a/lib/galaxy/tool_util/output_checker.py"
  - "https://github.com/galaxyproject/galaxy/blob/a63da1dfd1960360f4aa2fddc6a75396954d750a/lib/galaxy/jobs/command_factory.py"
  - "https://github.com/galaxyproject/galaxy/blob/a63da1dfd1960360f4aa2fddc6a75396954d750a/lib/galaxy/jobs/__init__.py"
  - "https://github.com/galaxyproject/galaxy/blob/a63da1dfd1960360f4aa2fddc6a75396954d750a/lib/galaxy/jobs/runners/__init__.py"
  - "https://github.com/galaxyproject/galaxy/blob/a63da1dfd1960360f4aa2fddc6a75396954d750a/lib/galaxy/model/__init__.py"
  - "https://github.com/galaxyproject/galaxy/blob/a63da1dfd1960360f4aa2fddc6a75396954d750a/lib/galaxy/schema/schema.py"
  - "https://github.com/galaxyproject/galaxy/blob/a63da1dfd1960360f4aa2fddc6a75396954d750a/lib/galaxy/schema/jobs.py"
  - "https://github.com/galaxyproject/galaxy/blob/a63da1dfd1960360f4aa2fddc6a75396954d750a/lib/galaxy/webapps/galaxy/api/jobs.py"
  - "https://github.com/galaxyproject/galaxy/blob/a63da1dfd1960360f4aa2fddc6a75396954d750a/lib/galaxy/webapps/galaxy/services/jobs.py"
  - "https://github.com/galaxyproject/galaxy/blob/a63da1dfd1960360f4aa2fddc6a75396954d750a/lib/galaxy/managers/jobs.py"
summary: "Reference for Galaxy tool stdio rules, job failure detection, job states, and job API failure surfaces."
---

# Galaxy tool and job failure reference

A failed Galaxy job preserves execution evidence separately from workflow scheduling and output assertions. Start with its state, exit code, structured messages, and separate tool and runner streams. A red downstream dataset or stderr text alone does not identify the original failure.

[[galaxy-workflow-invocation-failure-reference]] covers scheduling and dependency messages. [[planemo-workflow-test-architecture]] locates the structured Planemo artifacts, and [[debug-galaxy-workflow-output]] uses this evidence to classify a failure before proposing repairs.

## Retrieve job evidence

For an encoded job ID from an invocation or Planemo result, request `GET /api/jobs/{job_id}?full=true`. Preserve the response alongside the invocation ID, history ID, Galaxy version, and Planemo test result.

```bash
curl --fail --silent --show-error \
  -H "x-api-key: $GALAXY_API_KEY" \
  "$GALAXY_URL/api/jobs/$JOB_ID?full=true" \
  > job.json
```

Set `GALAXY_URL` to the server base URL without a trailing slash. The API key must have access to the job. These requests inspect an existing run. The contracts below describe the pinned Galaxy source in this page's sources, not every deployed version.

| Field | Evidence |
|---|---|
| `id`, `tool_id`, `tool_version`, `state` | Identify the execution and the wrapper version whose failure rules apply. |
| `exit_code` | Process exit code recorded by the runner. A missing value is not evidence of exit code zero. |
| `tool_stdout`, `tool_stderr` | Captured streams from the tool command. |
| `job_stdout`, `job_stderr` | Captured streams from the job wrapper or runner context. |
| `stdout`, `stderr` | Combined compatibility views of tool and job streams. They lose the stream provenance. |
| `job_messages` | Structured records from stdio checks or output discovery. Empty messages do not prove success. |
| `dependencies` | Job dependencies included with full detail. |

Prefer separate streams for diagnosis. A runner failure can occur before the tool executes, and output processing can fail after the command exits successfully.

## Job and output dataset states

| Job state | Interpretation |
|---|---|
| `new`, `waiting`, `upload`, `queued`, `running`, `resubmitted` | Execution is pending or in progress. A timeout while polling these states needs timing and runner evidence. |
| `ok` | Galaxy accepted the execution. Check the expected outputs and assertions separately. |
| `error`, `failed` | Failure states. Inspect full detail and the producing job's outputs. |
| `paused` | Execution is blocked or paused. Inspect upstream inputs and pause information before blaming the tool command. |
| `skipped` | Execution was skipped, for example by a workflow condition. It is not itself a tool failure. |
| `stop`, `stopped`, `deleting`, `deleted` | Stopping or deletion states. Determine whether cancellation or deletion explains the missing result. |

The API value for a stop in progress is `stop`, not `stopping`. Consumers use different terminal-state sets. Do not infer tool success from a workflow completion record, or infer permanent failure merely because polling stopped.

Output datasets have their own states, including `ok`, `error`, `paused`, `failed_metadata`, `deferred`, and `discarded`. `failed_metadata` identifies a metadata problem, while `deferred` denotes data awaiting materialization. Dataset deletion and purging are separate flags. For a red downstream output, trace its producing job and upstream datasets instead of treating job and dataset states as interchangeable. For mapped jobs, retain the failed member's job ID and collection element identifier. See [[galaxy-collection-semantics]].

## Wrapper failure rules

Galaxy loads an XML wrapper's failure rules from `<command>` and `<stdio>`, then checks the captured tool exit code and streams. Inspect the installed wrapper and its `profile` before interpreting a non-zero exit or stderr text.

| Control | Behavior |
|---|---|
| Omitted `detect_errors` or `detect_errors="default"` | Adds non-zero exit-code checks for profiles other than legacy `16.01` only when there is no `<stdio>` element. An explicit `<stdio>` disables this implicit preset, even if it contains no rules. |
| `detect_errors="exit_code"` | Adds fatal checks for negative and positive non-zero exit codes. Optional `oom_exit_code` adds an OOM-specific check before those ranges. |
| `detect_errors="aggressive"` | Adds non-zero exit checks and case-insensitive checks on both streams for OOM text, `exception:`, and `error:`. |
| `<stdio><exit_code ... /></stdio>` | Defines explicit values or inclusive ranges and their severity. Open-ended ranges such as `1:` are supported. |
| `<stdio><regex ... /></stdio>` | Searches selected tool streams case-insensitively. With no source specified, both stdout and stderr are searched. |
| `<command strict="true">` | Requests `set -e` in the generated tool script. The default is true for profiles `20.09` and newer, false for older profiles. |

Explicit stdio rules are prepended to rules from an explicitly selected `exit_code` or `aggressive` preset. Adding a warning for an exit code does not override a later fatal preset rule matching that code.

When **no exit-code or regex rules exist**, the output checker falls back to treating any nonempty tool stderr as an error. In this fallback, a non-zero exit code with empty stderr does not itself trigger failure. Conversely, with configured rules, ordinary stderr text is not automatically fatal.

Shell strictness and stdio checks serve different purposes. `set -e` can stop a multi-command script before later commands hide an earlier error, but follows the shell's exceptions and does not add `pipefail`. It does not guarantee that every component of a pipeline succeeded. Galaxy's command factory also bypasses script creation when the configured shell is `none`.

## Rule ordering and structured messages

Exit-code checks run before regex checks. Within each group, explicit rules precede presets. Regex rules check stderr before stdout when both are selected.

| XML level | Numeric `error_level` | Effect |
|---|---:|---|
| `log` | 1 | Records an informational message. |
| `qc` | 1.1 | Records a quality-control message. |
| `warning` | 2 | Records a warning. |
| `fatal` | 3 | Classifies a generic tool error. |
| `fatal_oom` | 4 | Classifies an out-of-memory error and stops further checking. |

Log, QC, and warning matches do not fail the job by themselves. A generic `fatal` match does **not** stop all later checks. A later OOM match can upgrade the classification. The checker tracks the maximum severity, and level 4 ends checking. OOM classification can inform runner resubmission, but retry policy depends on the runner and destination configuration.

Structured `job_messages` retain the matching rule evidence:

| Message `type` | Additional fields |
|---|---|
| `exit_code` | `exit_code`, `code_desc`, `desc`, `error_level`. |
| `regex` | `stream`, `match`, `code_desc`, `desc`, `error_level`. |
| `max_discovered_files` | `desc`, `error_level` for output-discovery failures, including too many files or an output name that is too long. |

Regex `match` text is truncated after 256 characters when longer. `code_desc` is the rule's description, while `desc` includes the detected severity and explanation. Preserve the raw message rather than reducing it to “stderr contained an error.” Fallback stderr failure and runner errors need not produce stdio messages.

## Job API reference

Paths are relative to the server URL and use encoded API IDs.

| Method and path | Result |
|---|---|
| `GET /api/jobs` | Lists accessible jobs with filters including state, tool ID, history ID, workflow ID, and invocation ID. |
| `GET /api/jobs/{job_id}` | Basic job detail, including state, tool identity, and exit code. |
| `GET /api/jobs/{job_id}?full=true` | Adds separate and combined streams, `job_messages`, and dependencies. |
| `GET /api/jobs/{job_id}/stdout` | Combined stdout as plain text. |
| `GET /api/jobs/{job_id}/stderr` | Combined stderr as plain text. |
| `GET /api/jobs/{job_id}/console_output` | Tool console output, subject to the requirements below. |
| `GET /api/jobs/{job_id}/inputs` | Job input datasets. |
| `GET /api/jobs/{job_id}/outputs` | Job output datasets and collections. |
| `GET /api/jobs/{job_id}/metrics` | Job metrics subject to access policy and availability. |
| `GET /api/jobs/{job_id}/common_problems` | Simple checks such as empty or duplicate inputs. These are clues, not a complete diagnosis. |

`console_output` requires all four query parameters: `stdout_position`, `stdout_length`, `stderr_position`, and `stderr_length`. For example:

```text
/api/jobs/{job_id}/console_output?stdout_position=0&stdout_length=4096&stderr_position=0&stderr_length=4096
```

The destination must enable `live_tool_output_reporting`, including when retrieving a finished job through this endpoint. While running, Galaxy reads the requested ranges from tool stream files. Otherwise it returns stored tool streams. Prefer full job detail for preserved failure evidence when live reporting is unavailable.

Full detail does not grant administrator access. System details such as traceback, runner, destination, handler, and external job ID can require an administrator. Command-line exposure also depends on server configuration, and full-detail `job_metrics` are added for administrators. Request the missing server or runner evidence when needed instead of assuming a normal workflow-testing key can retrieve it.

## Diagnostic pitfalls and verification limits

- **Stderr is evidence, not a verdict.** Warnings can be harmless under configured stdio rules. An aggressive regex can also classify text as fatal despite exit code zero. Compare streams with the installed wrapper's rules.
- **Exit code zero is not scientific success.** Output collection, metadata, and assertions can still fail. Preserve output states and Planemo's `output_problems` alongside job records.
- **A paused consumer may hide an upstream failure.** Follow dependencies and producing jobs before changing the consumer's parameters.
- **No messages is not a clean bill of health.** A runner, fallback stderr check, or output-processing failure can leave no matching stdio record. Keep all available streams and state evidence.
- **Resubmission changes the context.** Record runner and destination details when available and distinguish an OOM classification from a configured retry decision.

The parser, checker, state definitions, and API contracts were inspected in the pinned Galaxy source. No live run verified every runner's stream capture, OOM resubmission, or access configuration. Check the deployed server and installed wrapper before applying version-sensitive conclusions.
