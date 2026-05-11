---
type: cli-command
tool: planemo
command: workflow_test_on_invocation
package: "planemo"
upstream: "https://github.com/galaxyproject/planemo/blob/a9b8b8bc7ab3b12035d53bdb5383fe450413d9f3/planemo/commands/cmd_workflow_test_on_invocation.py"
tags:
  - cli-command
  - cli/planemo
status: draft
created: 2026-05-11
revised: 2026-05-11
revision: 1
ai_generated: true
summary: "Run defined tests against existing workflow invocation."
---

<!-- planemo-cli-meta: BEGIN auto-generated -->

# `planemo workflow_test_on_invocation`

Run defined tests against existing workflow invocation.

## Synopsis

```text
planemo workflow_test_on_invocation [OPTIONS] TEST.YML INVOCATION_ID
```


## Arguments

| Argument | Type | Required | Help |
|---|---|---|---|
| TEST.YML | path | yes | — |
| INVOCATION_ID | text | yes | — |

## Options

| Option | Type | Default | Required | Help |
|---|---|---|---|---|
| --galaxy_url | text | — | yes | Remote Galaxy URL to use with external Galaxy engine. |
| --galaxy_user_key | text | — | yes | User key to use with external Galaxy engine. |
| --test_index | integer | 1 | — | Select which test to check. Counting starts at 1 |
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

<!-- planemo-cli-meta: END auto-generated -->
## Output

<!-- Hand-edited. Preserved across `tsx scripts/sync-planemo-cli.ts`. -->

_Describe stdout/stderr shape, exit-code contract, and any JSON-report flags here._

## Examples

<!-- Hand-edited. Preserved across `tsx scripts/sync-planemo-cli.ts`. -->

_Add canonical invocations here._

## Gotchas

<!-- Hand-edited. Preserved across `tsx scripts/sync-planemo-cli.ts`. -->

_Document non-obvious behavior and common failure modes here._
