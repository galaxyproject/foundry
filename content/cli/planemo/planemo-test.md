---
type: cli-command
tool: planemo
command: test
package: "planemo"
upstream: "https://github.com/galaxyproject/planemo/blob/0.75.45/planemo/commands/cmd_test.py"
tags:
  - cli/planemo
status: draft
created: 2026-05-11
revised: 2026-05-11
revision: 1
ai_generated: true
summary: "Run specified tool or workflow tests within Galaxy."
---

<!-- planemo-cli-meta: BEGIN auto-generated -->

# `planemo test`

Run specified tool or workflow tests within Galaxy.

## Synopsis

```text
planemo test [OPTIONS] TOOL_PATH
```


## Arguments

| Argument | Type | Required | Help |
|---|---|---|---|
| TOOL_PATH | path | — | — |

## Options

| Option | Type | Default | Required | Help |
|---|---|---|---|---|
| --failed, --lf | flag | false | — | Re-run only failed tests from the previous run. Reads from --failed_json (or --test_output_json if not set) to determine which tests failed. |
| --failed_json | path | — | — | JSON file from a previous planemo test run to read failed test IDs from when using --failed/--lf. Defaults to --test_output_json. |
| --test_index | integer | [] | — | Index(es) of specific test(s) to run (1-based). Can be specified multiple times (e.g., --test_index 1 --test_index 3) to run specific tests. If not specified, all tests are run. |
| --polling_backoff | integer | 0 | — | Poll resources with an increasing interval between requests. Useful when testing against remote and/or production instances to limit generated traffic. |
| --galaxy_root | directory | — | — | Root of development galaxy directory to execute command with. |
| --galaxy_python_version | choice | — | — | Python version to start Galaxy under |
| --extra_tools | path | — | — | Extra tool sources to include in Galaxy's tool panel (file or directory). These will not be linted/tested/etc... but they will be available to workflows and for interactive use. |
| --install_galaxy | flag | false | — | Download and configure a disposable copy of Galaxy from github. |
| --galaxy_branch | text | — | — | Branch of Galaxy to target (defaults to master) if a Galaxy root isn't specified. |
| --galaxy_source | text | — | — | Git source of Galaxy to target (defaults to the official galaxyproject github source if a Galaxy root isn't specified. |
| --skip_venv | flag | false | — | Do not create or source a virtualenv environment for Galaxy, this should be used to preserve an externally configured virtual environment or conda environment. |
| --no_cache_galaxy | flag | false | — | Skip caching of Galaxy source and dependencies obtained with --install_galaxy. Not caching this results in faster downloads (no git) - so is better on throw away instances such with TravisCI.  |
| --no_cleanup | flag | false | — | Do not cleanup temp files created for and by Galaxy. |
| --galaxy_email | text | planemo@galaxyproject.org | — | E-mail address to use when launching single-user Galaxy server. |
| --docker, --no_docker | flag | false | — | Run Galaxy tools in Docker if enabled. |
| --docker_cmd | text | docker | — | Command used to launch docker (defaults to docker). |
| --docker_sudo, --no_docker_sudo | flag | false | — | Flag to use sudo when running docker. |
| --docker_host | text | — | — | Docker host to target when executing docker commands (defaults to localhost). |
| --docker_sudo_cmd | text | sudo | — | sudo command to use when --docker_sudo is enabled (defaults to sudo). |
| --docker_run_extra_arguments | text | — | — | Extra arguments to pass to docker run. |
| --mulled_containers, --biocontainers | flag | false | — | Test tools against mulled containers (forces --docker). Disables conda resolution unless any conda option has been set explicitly. |
| --galaxy_startup_timeout | integer range | 900 | — | Wait for galaxy to start before assuming Galaxy did not start. |
| --job_config_file | file | — | — | Job configuration file for Galaxy to target. |
| --job_workers | integer | 1 | — | Number of workers for the local job runner (default 1). |
| --tool_dependency_dir | directory | — | — | Tool dependency dir for Galaxy to target. |
| --tool_data_path | directory | — | — | Directory where data used by tools is located. Required if tests are run in docker and should make use of external reference data. |
| --test_data | directory | — | — | test-data directory to for specified tool(s). |
| --tool_data_table | path | — | — | tool_data_table_conf.xml file to for specified tool(s). |
| --dependency_resolvers_config_file | file | — | — | Dependency resolver configuration for Galaxy to target. |
| --brew_dependency_resolution | flag | false | — | Configure Galaxy to use plain brew dependency resolution. |
| --shed_dependency_resolution | flag | false | — | Configure Galaxy to use brewed Tool Shed dependency resolution. |
| --no_dependency_resolution | flag | false | — | Configure Galaxy with no dependency resolvers. |
| --conda_prefix | directory | — | — | Conda prefix to use for conda dependency commands. |
| --conda_exec | file | — | — | Location of conda executable. |
| --conda_channels, --conda_ensure_channels | text | conda-forge,bioconda | — | Ensure conda is configured with specified comma separated list of channels. |
| --conda_use_local | flag | false | — | Use locally built packages while building Conda environments. |
| --conda_dependency_resolution | flag | false | — | Configure Galaxy to use only conda for dependency resolution. |
| --conda_auto_install, --no_conda_auto_install | flag | true | — | Conda dependency resolution for Galaxy will attempt to install requested but missing packages. |
| --conda_auto_init, --no_conda_auto_init | flag | true | — | Conda dependency resolution for Galaxy will auto install conda itself using miniforge if not availabe on conda_prefix. |
| --simultaneous_uploads, --no_simultaneous_uploads | flag | false | — | When uploading files to Galaxy for tool or workflow tests or runs, upload multiple files simultaneously without waiting for the previous file upload to complete. |
| --check_uploads_ok, --no_check_uploads_ok | flag | true | — | When uploading files to Galaxy for tool or workflow tests or runs, check that the history is in an 'ok' state before beginning tool or workflow execution. |
| --profile | text | — | — | Name of profile (created with the profile_create command) to use with this command. |
| --database_type | choice | auto | — | Type of database to use for profile - 'auto', 'sqlite', 'postgres', 'postgres_docker' , and postgres_singularity are available options. Use postgres to use an existing postgres server you user can access without a password via the psql command. Use postgres_docker to have Planemo manage a docker container running postgres. . Use  postgres_singularity to have Planemo run postgres using singularity/apptainer. Data with postgres_docker is not yet persisted past when you restart the docker container launched by Planemo so be careful with this option. |
| --postgres_psql_path | text | psql | — | Name or or path to postgres client binary (psql). |
| --postgres_database_user | text | postgres | — | Postgres username for managed development databases. |
| --postgres_database_host | text | — | — | Postgres host name for managed development databases. |
| --postgres_database_port | text | — | — | Postgres port for managed development databases. |
| --file_path | directory | — | — | Location for files created by Galaxy (e.g. database/files). |
| --database_connection | text | — | — | Database connection string to use for Galaxy. |
| --postgres-storage-location | text | — | — | storage path for postgres database, used for local singularity postgres. |
| --shed_tool_conf | text | — | — | Location of shed tools conf file for Galaxy. |
| --shed_tool_path | text | — | — | Location of shed tools directory for Galaxy. |
| --shed_tool_data_table_config | text | — | — | Location of the shed tool data table config file for Galaxy (records data tables registered by shed-installed repositories). |
| --shed_data_manager_config | text | — | — | Location of the shed data manager config file for Galaxy. |
| --shed_data_dir | directory | — | — | Persistent base directory for shed-install state (local Galaxy engine). Seeds defaults for --shed_tool_conf, --shed_tool_path, --shed_tool_data_table_config and --shed_data_manager_config so shed installs (tools and their data tables) survive Galaxy restarts. Individual options still override. |
| --galaxy_single_user, --no_galaxy_single_user | flag | true | — | By default Planemo will configure Galaxy to run in single-user mode where there is just one user and this user is automatically logged it. Use --no_galaxy_single_user to prevent Galaxy from running this way. |
| --tool_evaluation_strategy | choice | — | — | Determines which process will evaluate the tool command line. If set to 'local' the tool command line will be templated in the job handler process. If set to 'remote' the tool command line will be built as part of the submitted job (beta). Setting this to 'remote' will also implicitly set metadata_strategy to 'extended', which is required for remote tool evaluation. |
| --paste_test_data_paths, --no_paste_test_data_paths | flag | — | — | By default Planemo will use or not use Galaxy's path paste option to load test data into a history based on the engine type it is targeting. This can override the logic to explicitly enable or disable path pasting. |
| --update_test_data | flag | false | — | Update test-data directory with job outputs (normally written to directory --job_output_files if specified.) |
| --test_output | path | tool_test_output.html | — | Output test report (HTML - for humans) defaults to tool_test_output.html. |
| --test_output_text | path | — | — | Output test report (Basic text - for display in CI) |
| --test_output_markdown | path | — | — | Output test report (Markdown style - for humans & computers) |
| --test_output_markdown_minimal | path | — | — | Output test report (Minimal markdown style - jost the table) |
| --test_output_xunit | path | — | — | Output test report (xunit style - for CI systems |
| --test_output_junit | path | — | — | Output test report (jUnit style - for CI systems |
| --test_output_allure | directory | — | — | Output test allure2 framework resutls |
| --test_output_json | path | tool_test_output.json | — | Output test report (planemo json) defaults to tool_test_output.json. |
| --job_output_files | directory | — | — | Write job outputs to specified directory. |
| --summary | choice | minimal | — | Summary style printed to planemo's standard output (see output reports for more complete summary). Set to 'none' to disable completely. |
| --test_timeout | integer | 86400 | — | Maximum runtime of a single test in seconds. |
| --fail_fast | flag | false | — | Stop on first job failure. |
| --engine | choice | — | — | Select an engine to run or test artifacts such as tools and workflows. Defaults to a local Galaxy, but running Galaxy within a Docker container or the CWL reference implementation 'cwltool' and 'toil' be selected. |
| --non_strict_cwl | flag | false | — | Disable strict validation of CWL. |
| --no-container, --no_container | flag | false | — | If cwltool engine is used, disable Docker container usage. |
| --docker_galaxy_image | text | quay.io/bgruening/galaxy | — | Docker image identifier for docker-galaxy-flavor used if engine type is specified as ``docker-galaxy``. Defaults to quay.io/bgruening/galaxy. |
| --docker_extra_volume | path | — | — | Extra path to mount if --engine docker or `--biocontainers` or `--docker`. |
| --ignore_dependency_problems | flag | false | — | When installing shed repositories for workflows, ignore dependency issues. These likely indicate a problem but in some cases may not prevent a workflow from successfully executing. |
| --shed_install, --no_shed_install | flag | true | — | By default Planemo will attempt to install repositories needed for workflow testing. This may not be appropriate for production servers and so this can disabled by calling planemo with --no_shed_install. |
| --install_tool_dependencies, --no_install_tool_dependencies | flag | false | — | Turn on installation of tool dependencies using classic toolshed packages. |
| --install_resolver_dependencies, --no_install_resolver_dependencies | flag | true | — | Skip installing tool dependencies through resolver (e.g. conda). |
| --install_repository_dependencies, --no_install_repository_dependencies | flag | true | — | Skip installing the repository dependencies. |
| --galaxy_url | text | — | — | Remote Galaxy URL to use with external Galaxy engine. |
| --galaxy_admin_key | text | — | — | Admin key to use with external Galaxy engine. |
| --galaxy_user_key | text | — | — | User key to use with external Galaxy engine. |
| --history_name | text | — | — | Name to give a Galaxy history, if one is created. |
| --history_id | text | — | — | Send the results of the run to the history with the provided ID. A history with this ID must exist. |
| --no_wait | flag | false | — | After invoking a job or workflow, do not wait for completion. |

<!-- planemo-cli-meta: END auto-generated -->
## Output

<!-- Hand-edited. Preserved across `tsx scripts/sync-planemo-cli.ts`. -->

Use `--test_output_json <path>` for machine-readable results; stdout and stderr are human-oriented.

## Examples

<!-- Hand-edited. Preserved across `tsx scripts/sync-planemo-cli.ts`. -->

```sh
planemo test <tool_dir> --test_output_json <tool_dir>/_planemo_test_report.json
```

## Gotchas

<!-- Hand-edited. Preserved across `tsx scripts/sync-planemo-cli.ts`. -->

No Foundry-specific gotchas recorded yet.
