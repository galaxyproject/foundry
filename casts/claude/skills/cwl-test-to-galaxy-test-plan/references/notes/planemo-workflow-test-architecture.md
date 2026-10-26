---
type: research
title: "Planemo workflow-test architecture"
tags:
  - tool/planemo
  - target/galaxy
status: draft
created: 2026-05-02
revised: 2026-10-26
revision: 4
related_notes:
  - "[[galaxy-workflow-testability-design]]"
  - "[[galaxy-tool-job-failure-reference]]"
  - "[[galaxy-workflow-invocation-failure-reference]]"
  - "[[planemo-asserts-idioms]]"
  - "[[galaxy-user-tool-workflow-binding]]"
  - "[[iwc-test-data-conventions]]"
related_molds:
  - "[[run-workflow-test]]"
  - "[[debug-galaxy-workflow-output]]"
  - "[[implement-galaxy-workflow-test]]"
sources:
  - "~/projects/repositories/planemo/planemo/commands/cmd_test.py"
  - "~/projects/repositories/planemo/planemo/commands/cmd_run.py"
  - "~/projects/repositories/planemo/planemo/galaxy/activity.py"
  - "~/projects/repositories/planemo/planemo/galaxy/invocations"
  - "~/projects/repositories/planemo/planemo/galaxy/config.py"
  - "~/projects/repositories/planemo/planemo/galaxy/workflows.py"
  - "https://github.com/galaxyproject/galaxy/blob/5af1d03c929748006dd53ad451e5cb1fd140399a/lib/galaxy/webapps/galaxy/api/tool_data.py"
  - "https://github.com/galaxyproject/galaxy/blob/5af1d03c929748006dd53ad451e5cb1fd140399a/lib/galaxy/managers/tool_data.py"
summary: "Reference for Planemo workflow test/run architecture, Galaxy modes, user-defined-tool and data-table runs, API polling, and noisy failure boundaries."
---

# Planemo Workflow-Test Architecture

This note describes Planemo architecture relevant to workflow tests and workflow runs. It is reference material for Molds that need to run tests or interpret Planemo artifacts, not a command-selection recipe.

## Main Commands

| User action | Command | Core behavior |
|---|---|---|
| Full workflow test | `planemo test <workflow>` ([[planemo-test]]) | Finds test definitions, starts or targets Galaxy, stages inputs, invokes workflow, checks assertions, writes reports. |
| Direct run | `planemo run <workflow> <job.yml>` | Runs one workflow/job pair and can download outputs without assertion checks. |
| Recheck assertions | `planemo workflow_test_on_invocation <tests.yml> <invocation_id>` ([[planemo-workflow_test_on_invocation]]) | Runs test assertions against an existing invocation without rerunning the workflow. |
| Track invocation | `planemo workflow_track <invocation_id>` | Polls an existing invocation and displays progress. |
| Generate test from invocation | `planemo workflow_test_init --from_invocation <id>` ([[planemo-workflow_test_init]]) | Builds a test template from a completed invocation and its outputs. |
| Generate job template | `planemo workflow_job_init <workflow>` | Creates a job-input template for a workflow. |

Observed code paths live under `~/projects/repositories/planemo/planemo/commands/`, `planemo/engine/`, and `planemo/galaxy/`.

## Engine Selection

Planemo chooses between engines early:

- CWL runnables can use CWL-specific engines.
- Supplying `--galaxy_url` implies an external running Galaxy unless an engine is explicitly selected.
- Default Galaxy workflow testing uses a managed local Galaxy engine, except for workflows that embed user-defined tools (see [Workflows that embed user-defined tools](#workflows-that-embed-user-defined-tools)).
- `--engine docker_galaxy` uses a managed Dockerized Galaxy.
- `--engine external_galaxy` uses an existing running Galaxy.

“Existing Galaxy” can mean two different things:

- Existing local Galaxy source tree, still managed by Planemo for this run.
- Existing running Galaxy server, addressed through URL and API keys.

Mold output and eval logs should record which meaning applies.

## Managed Galaxy Configuration

For managed Galaxy, Planemo builds a temporary configuration directory and generated Galaxy config. It can configure tool config, shed tool config, job config, file sources, object store paths, dependency config, SQLite database by default, admin users, API keys, and environment overrides.

Important managed-mode behavior:

- Planemo may find a local Galaxy root or install/use a cached Galaxy source tree.
- `--galaxy_branch` selects which Galaxy branch is cloned when no Galaxy root is supplied; it defaults to `master`. Omitting it therefore tests against the newest Galaxy. Naming an older `release_*` branch narrows what workflow syntax Galaxy will accept, and the resulting rejection surfaces as an invocation-time error rather than as a version mismatch.
- Managed Galaxy defaults are convenient but may not match production Galaxy behavior.
- Planemo can install workflow tool dependencies through Tool Shed metadata when configured.
- Test histories are created automatically unless a history id is supplied.

## External Galaxy Configuration

For external Galaxy, Planemo uses supplied Galaxy URL and API keys. A user key runs workflows; an admin key may be needed for installing missing repositories or creating a user key.

External Galaxy mode is useful when the target environment matters, but failure surfaces can include server configuration, installed tools, permissions, and existing history state. Eval logs should preserve URL/key mode without storing secrets.

## Workflows That Embed User-Defined Tools

A workflow with a `GalaxyUserTool` under any step's `run:` cannot be tested on a Planemo-managed Galaxy. Planemo collects every tool step's `tool_id` while it builds the managed Galaxy's configuration, and an embedded step has none, so `planemo test` and `planemo serve <workflow>` fail with `KeyError: 'tool_id'` before Galaxy starts ([galaxyproject/planemo#1757](https://github.com/galaxyproject/planemo/issues/1757)). With a `tool_id` added by hand, the import then fails with HTTP 403 "User is not allowed to run unprivileged tools", because the managed test user has no role that allows running user-defined tools.

Run these workflows against a Galaxy that Planemo serves, as an external Galaxy. [[galaxy-user-tool-workflow-binding]] defines the server setting and user role this provisions.

1. Serve an empty directory. Serving the workflow itself hits the same `KeyError`. Planemo enables beta tool formats in every Galaxy it configures, and the override variable below makes that explicit. `--docker` lets the embedded tools' `container:` images run.

   ```sh
   mkdir -p empty
   GALAXY_CONFIG_OVERRIDE_ENABLE_BETA_TOOL_FORMATS=true \
     planemo serve --docker --port 9123 empty
   ```

2. With the served Galaxy's admin key (`test_key` by default), provision a user that can run embedded tools. Galaxy checks the role, not admin status, so the admin user needs the role as much as any other user. Do not store the user key in run artifacts.

   | Request | Body |
   | --- | --- |
   | `POST /api/users` | `{"username": "...", "email": "...", "password": "..."}` |
   | `POST /api/roles` | `{"name": "udt_exec", "description": "run user-defined tools", "user_ids": ["<user id>"], "role_type": "user_tool_execute"}` |
   | `POST /api/users/<user id>/api_key` | none. The response is the user key. |

3. Preinstall every Tool Shed repository the workflow references, at any subworkflow depth, by listing them in an ephemeris tool list and running `shed-tools install -g http://localhost:9123 -a test_key -t tools.yml`. The [data-table check](#data-table-inputs) needs the tools installed before the run. The pinned [[planemo]] release would also miss the nested ones, because it installs repositories from top-level format2 steps only. Planemo `master` walks embedded subworkflows ([galaxyproject/planemo#1742](https://github.com/galaxyproject/planemo/pull/1742)).
4. Run the test against the served Galaxy:

   ```sh
   planemo test --engine external_galaxy \
     --galaxy_url http://localhost:9123 \
     --galaxy_admin_key test_key --galaxy_user_key "$USER_KEY" \
     --test_output_json tool_test_output.json \
     workflow.gxwf.yml
   ```

This route passed a small workflow with embedded tools 1/1, using planemo 0.75.47 serving Galaxy `master`. Record the mode as external Galaxy, the reason (embedded tools), how repositories were installed, and the Galaxy URL. Stop the served Galaxy after the run.

## Data-Table Inputs

A tool select backed by a Galaxy data table (`<options from_data_table="...">`) accepts only values that the target Galaxy's table contains. Admins populate tables with data managers or `.loc` files. A fresh Galaxy that installs the tool from the Tool Shed registers the table from the repository's `.loc.sample` file, which usually holds no rows. The Foundry discourages data tables in translated workflows ([[nextflow-to-galaxy-reference-data-mapping]]), so a workflow test that needs one is usually a design gap to report, not a server to fix.

Detect the dependency before running:

1. **Find the table.** The parsed tool model hides it: a data-table select has `options: null`. Read the tool source instead. The Tool Shed serves it with macros expanded at `GET /api/tools/<owner>~<repo>~<tool_id>/versions/<version>/tool_source`, with `+` in the version URL-encoded as `%2B`. The full Tool Shed GUID does not work as the id there. Collect every `from_data_table` attribute. One tool can read several tables, and a later table can filter on an earlier select's value.
2. **Keep the selects the step depends on.** Count every non-optional data-table select on the conditional branch the step takes, and every optional one its state sets. A select on a branch the step does not take is not a dependency.
3. **Query the table.** On an external Galaxy, after the workflow's tools are installed, call `GET /api/tool_data/<table>`. Any user key works because the endpoint is public. A 404 after the tools are installed means the repository registers no such table. An empty table returns `fields: []`. Otherwise check that some row carries the value the step selects.

A Planemo-managed Galaxy exists only while `planemo test` runs, so its tables cannot be queried before the invocation. Treat a data-table select as unmet there unless the repository's `.loc.sample` already carries the value, or the caller supplied data-table configuration that contains it, for example through Planemo's `--tool_data_table` and `--tool_data_path` options.

When the table or the row is missing, the test cannot pass. [[run-workflow-test]] records `not-run` and names the table, the value, and the step. Provisioning the table is optional and is the caller's decision. [[iwc-test-data-conventions]] covers how the test file writes a data-table value.

## API Interaction

Planemo primarily talks to Galaxy through BioBlend-backed clients.

Important operations:

- Import workflows into Galaxy.
- Stage datasets and collections into histories.
- Invoke workflows by input names.
- Poll invocations and jobs.
- Fetch job details with full detail when needed.
- Download outputs and output collections.
- Run assertion checks and write structured reports.

For workflows, Planemo invokes Galaxy using input labels/names. Stable generated labels are therefore important for both test execution and debugging.

Workflow testability design guidance lives in [[galaxy-workflow-testability-design]]. This architecture note only records why Planemo makes labels and workflow-level outputs operationally important.

## Structured Artifacts

Useful Planemo artifacts and fields:

| Artifact or field | Use |
|---|---|
| `tool_test_output.json` | Primary structured result artifact for tests. |
| invocation id | Key for Galaxy invocation API follow-up. |
| history id | Key for history contents and output inspection. |
| workflow id | Key for workflow invocation aliases and reruns. |
| output problems | Assertion and missing-output failures. |
| execution problem | Staging, invocation, API, or other execution-level failure. |
| invocation details | Step/job/output details Planemo collected from Galaxy. |
| job details | Tool id, state, exit code, command, stdout/stderr when collected. |

Terminal output is not enough for durable failure analysis. Preserve structured output whenever possible.

## Noisy Boundaries

Planemo transforms and summarizes Galaxy failure information. These are likely information-loss boundaries:

- Exceptions during execution can become stringified `ErrorRunResponse` values.
- Polling may summarize “at least one job is in error” while detailed job evidence is printed elsewhere or stored separately.
- Missing outputs become assertion/output problems, which can conflate label mismatch, workflow output omission, optional output absence, failed invocation, or output download issue.
- Output download failures may be logged but not always propagated as the most specific failure.
- External Galaxy without an admin key may defer missing-tool problems until runtime.
- `allow_tool_state_corrections=True` can let Galaxy adjust tool state during invocation, which is useful but can mask definition drift.
- `--no_wait` is not suitable for debug conclusions because invocation creation can succeed before jobs fail.

## Reference Use For Molds

For [[run-workflow-test]]:

- Preserve structured Planemo result output, invocation id, history id, workflow id, and Galaxy mode.
- Record whether the run used managed local Galaxy, Docker Galaxy, or external Galaxy.
- Do not treat terminal output as the primary failure artifact.

For [[debug-galaxy-workflow-output]]:

- Start from structured Planemo output.
- For missing-output failures, check label drift and omitted workflow-level outputs before assuming tool failure.
- If the failure is job-level, inspect Galaxy job APIs described in [[galaxy-tool-job-failure-reference]].
- If the failure is invocation-level, inspect Galaxy invocation APIs described in [[galaxy-workflow-invocation-failure-reference]].
- If only assertions failed, use [[planemo-asserts-idioms]] before deciding to rerun.

## Verification Gaps

Actual runs should verify:

- Which invocation messages Planemo exposes directly.
- Whether target Planemo/Galaxy versions populate `completed`, `/completion`, and step job summaries.
- How `workflow_test_on_invocation` behaves for failed, warning-only, mapped collection, and subworkflow invocations.
- Whether generated test cases from invocation preserve nested output collection structure correctly.
