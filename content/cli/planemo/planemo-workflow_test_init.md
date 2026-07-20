---
type: cli-command
tool: planemo
command: workflow_test_init
package: "planemo"
upstream: "https://github.com/galaxyproject/planemo/blob/0.75.45/planemo/commands/cmd_workflow_test_init.py"
tags:
  - cli-command
  - cli/planemo
status: draft
created: 2026-05-11
revised: 2026-05-11
revision: 1
ai_generated: true
summary: "Initialize a Galaxy workflow test description for supplied workflow."
---

<!-- planemo-cli-meta: BEGIN auto-generated -->

# `planemo workflow_test_init`

Initialize a Galaxy workflow test description for supplied workflow.

## Synopsis

```text
planemo workflow_test_init [OPTIONS] WORKFLOW_PATH_OR_ID
```


## Arguments

| Argument | Type | Required | Help |
|---|---|---|---|
| WORKFLOW_PATH_OR_ID | text | yes | — |

## Options

| Option | Type | Default | Required | Help |
|---|---|---|---|---|
| -f, --force | flag | false | — | Overwrite existing files if present. |
| -o, --output | file | — | — | — |
| --split_test, --no_split_test | flag | false | — | Write workflow job and test definitions to separate files. |
| --galaxy_url | text | — | — | Remote Galaxy URL to use with external Galaxy engine. |
| --galaxy_user_key | text | — | — | User key to use with external Galaxy engine. |
| --from_invocation, --from_uri | flag | false | — | Build a workflow test or job description from an invocation ID run on an external Galaxy.A Galaxy URL and API key must also be specified. This allows test data to be downloadedand inputs and parameters defined automatically. Alternatively, the default is to build thedescriptions from a provided workflow URI. |
| --profile | text | — | — | Name of profile (created with the profile_create command) to use with this command. |

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
