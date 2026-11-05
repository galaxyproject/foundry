---
type: research
title: "Planemo workflow-test architecture"
tags:
  - tool/planemo
  - target/galaxy
status: draft
created: 2026-05-02
revised: 2026-11-05
revision: 5
related_notes:
  - "[[galaxy-workflow-testability-design]]"
  - "[[galaxy-tool-job-failure-reference]]"
  - "[[galaxy-workflow-invocation-failure-reference]]"
  - "[[planemo-asserts-idioms]]"
  - "[[iwc-test-data-conventions]]"
  - "[[nextflow-params-to-galaxy-inputs]]"
related_molds:
  - "[[run-workflow-test]]"
  - "[[debug-galaxy-workflow-output]]"
  - "[[implement-galaxy-workflow-test]]"
  - "[[find-test-data]]"
sources:
  - "~/projects/repositories/planemo/planemo/commands/cmd_test.py"
  - "~/projects/repositories/planemo/planemo/commands/cmd_run.py"
  - "~/projects/repositories/planemo/planemo/galaxy/activity.py"
  - "~/projects/repositories/planemo/planemo/galaxy/invocations"
  - "~/projects/repositories/planemo/planemo/galaxy/config.py"
  - "~/projects/repositories/planemo/planemo/galaxy/serve.py"
  - "~/projects/repositories/planemo/planemo/engine/galaxy.py"
  - "https://github.com/galaxyproject/galaxy/blob/f7ef344ccb6/lib/galaxy/tool_util/data/__init__.py"
  - "https://github.com/galaxyproject/galaxy/blob/f7ef344ccb6/lib/galaxy/tool_util/deps/container_classes.py"
  - "https://github.com/galaxyproject/tools-iuc/blob/main/tools/amrfinderplus/tool_data_table_conf.xml.test"
summary: "Reference for Planemo workflow test/run architecture, Galaxy modes, data-table staging, API polling, and noisy failure boundaries."
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
- Default Galaxy workflow testing uses a managed local Galaxy engine.
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

### Workflow Import Failures

Planemo imports the workflow while it brings Galaxy up for the run (`config.install_workflows()`, called from `_serve()` in `planemo/galaxy/serve.py` for managed Galaxy and from `ExternalGalaxyEngine.ensure_runnables_served` in `planemo/engine/galaxy.py` for external Galaxy, as of planemo 0.75.47). For gxformat2 it converts the workflow to a native dict client-side first, so Galaxy's own gxformat2 conversion never runs. That is outside the per-test `execute()` wrapper that turns exceptions into an `ErrorRunResponse`. When Galaxy rejects the import request, BioBlend raises `ConnectionError`, the test command exits non-zero, and Planemo writes neither the `--test_output_json` report nor the HTML report. No workflow, history, or invocation id exists.

The evidence then lives in three places:

| Evidence | What it holds |
|---|---|
| Upload response | HTTP status and body. A 400 usually names the failing field or validation rule. A 500 body rarely explains the cause. |
| Galaxy server log | The traceback for the failing request, the only place a 500's cause appears. Managed Galaxy streams its log into the Planemo terminal output and keeps it on disk. External Galaxy keeps it on the server. |
| Planemo terminal log | The BioBlend exception and the point in the run where it was raised. |

Re-importing the same converted dict as the same user on the same server reproduces the failure without the rest of the Planemo run, which makes it the cheap loop for isolating a trigger.

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

## Staging a Data Table for a Workflow Test

Some wrappers take a reference database only from a Galaxy data table (`<options from_data_table="...">`) and offer no dataset input. A test of a workflow that uses one needs a row for a test-size database. On a Planemo-managed Galaxy that row can travel with the workflow, because Planemo discovers the table configuration by name and needs no flag. This recipe covers existing wrappers with no other intake. It doesn't license adding new tables to a translated workflow, which [[nextflow-params-to-galaxy-inputs]] rules out.

Lay the files out beside the workflow, with each `.loc` file next to the configuration:

```text
galaxy-workflow.gxwf.yml
galaxy-workflow.gxwf-tests.yml
test-data/
  tool_data_table_conf.xml.test
  amrfinderplus_versioned.loc
  amrfinderplus-test-db/
```

`test-data/tool_data_table_conf.xml.test` declares every table the test needs:

```xml
<?xml version="1.0"?>
<tables>
    <table name="amrfinderplus_versioned_database" comment_char="#">
        <columns>value, name, db_version, path</columns>
        <file path="${__HERE__}/amrfinderplus_versioned.loc" />
    </table>
</tables>
```

`test-data/amrfinderplus_versioned.loc` holds tab-separated rows in that column order:

```text
amrfinderplus_V4.2_2026-05-15.1	V4.2-2026-05-15.1	4.2	${__HERE__}/amrfinderplus-test-db
```

The test file passes the row's `value` column as a plain scalar, as [[iwc-test-data-conventions]] describes for any data-table input.

| Rule | Why |
|---|---|
| Name the file exactly `tool_data_table_conf.xml.test`. | Planemo looks for that name in the workflow's directory, the working directory, then the detected `test-data/` directory, and uses the first match, so a stray copy beside the workflow overrides the one in `test-data/`. If none exists it falls back to `tool_data_table_conf.xml.sample` in the first two. An unsuffixed `tool_data_table_conf.xml` is ignored without a message, and the select then has no matching row. |
| Merge every table into one file. | Discovery returns a single file. |
| Don't pass `--tool_data_table`. | The flag replaces discovery rather than adding to it, and a command that needs it is tied to whoever ran it. Test plans and run commands carry no data-table flag. |
| Write every path with `${__HERE__}`. | Galaxy expands it in the configuration's `<file path>` and in each `.loc` line, so the fixture still works after a move. An absolute path works on one machine only. |
| Read `${__HERE__}` as the directory of the file it appears in. | The tools-iuc examples keep the configuration at the tool root and write `${__HERE__}/test-data/x.loc`. Copied into `test-data/` unchanged, that path doesn't exist. A `.loc` in a subdirectory also has to climb back to reach a database beside the configuration. |
| Copy `name` and `<columns>` from the repository's `tool_data_table_conf.xml.sample`. | The wrapper reads rows by column name, and a select's filter can reject a row, for example on a database format version. Check that the row passes the filter. |

A table Planemo didn't discover fails late. Galaxy accepts the invocation, the job ends in `error` with an empty command line and no stderr, and only the Galaxy log gives the reason: `job rejected while preparing: Parameter 'index': requires a value, but no legal values defined`.

This recipe passed with no data-table flag on planemo 0.75.47 and a managed Galaxy `release_26.1`, without containers, run from an unrelated working directory against the shed-installed `devteam/fasta_compute_length`, whose job read the database path from the staged `.loc`. The same files with the configuration named `tool_data_table_conf.xml` failed with the error above.

Discovery belongs to the local managed engine, so `planemo test` and `planemo serve` read the file. `--engine docker_galaxy` and `--engine external_galaxy` don't. An external Galaxy needs the table provisioned on the server.

Keep the database under `test-data/` for container jobs. Galaxy's default container volumes leave that directory out, but the job configuration Planemo generates adds the detected `test-data/` read-only for Docker and Singularity. `--job_config_file` replaces the generated configuration, so a custom one has to add the mount itself: `docker_volumes: $defaults,<test-data>:<test-data>:ro`.

## Noisy Boundaries

Planemo transforms and summarizes Galaxy failure information. These are likely information-loss boundaries:

- Exceptions during execution can become stringified `ErrorRunResponse` values.
- Polling may summarize “at least one job is in error” while detailed job evidence is printed elsewhere or stored separately.
- Missing outputs become assertion/output problems, which can conflate label mismatch, workflow output omission, optional output absence, failed invocation, or output download issue.
- Output download failures may be logged but not always propagated as the most specific failure.
- A rejected workflow import aborts the run before any structured report is written, so terminal and server logs are the only record.
- External Galaxy without an admin key may defer missing-tool problems until runtime.
- `allow_tool_state_corrections=True` can let Galaxy adjust tool state during invocation, which is useful but can mask definition drift.
- `--no_wait` is not suitable for debug conclusions because invocation creation can succeed before jobs fail.

## Reference Use For Molds

For [[run-workflow-test]]:

- Preserve structured Planemo result output, invocation id, history id, workflow id, and Galaxy mode.
- Record whether the run used managed local Galaxy, Docker Galaxy, or external Galaxy.
- Do not treat terminal output as the primary failure artifact.
- A staged data table applies only to the local managed engine. On an external or Docker Galaxy, a missing table row is a server provisioning gap, not a staging failure.

For [[find-test-data]] and [[implement-galaxy-workflow-test]]:

- Stage a data table for a data-table-only wrapper as [Staging a Data Table for a Workflow Test](#staging-a-data-table-for-a-workflow-test) describes.

For [[debug-galaxy-workflow-output]]:

- Start from structured Planemo output. When there is none because the workflow import failed, start from the upload response and the Galaxy server log.
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
- Whether a container job in a `planemo test` run reads a `${__HERE__}` database through the generated mount. The mount has been read from the rendered job configuration, not exercised by a job.
