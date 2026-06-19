---
type: cli-command
tool: planemo
command: cli_metadata
package: "planemo"
upstream: "https://github.com/galaxyproject/planemo/blob/0.75.44/planemo/commands/cmd_cli_metadata.py"
tags:
  - cli-command
  - cli/planemo
status: draft
created: 2026-05-11
revised: 2026-05-11
revision: 1
ai_generated: true
summary: "Export structured metadata for Planemo CLI commands."
---

<!-- planemo-cli-meta: BEGIN auto-generated -->

# `planemo cli_metadata`

Export structured metadata for Planemo CLI commands.

## Synopsis

```text
planemo cli_metadata [OPTIONS]
```


## Options

| Option | Type | Default | Required | Help |
|---|---|---|---|---|
| --format | choice | json | — | — |
| --command | text | — | — | Only export metadata for the selected command. |
| --include-internal | flag | false | — | Include internal commands not documented as public API. |

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
