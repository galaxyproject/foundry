---
type: cli-command
tool: planemo
command: lint
package: "planemo"
upstream: "https://github.com/galaxyproject/planemo/blob/a9b8b8bc7ab3b12035d53bdb5383fe450413d9f3/planemo/commands/cmd_lint.py"
tags:
  - cli-command
  - cli/planemo
status: draft
created: 2026-05-11
revised: 2026-05-11
revision: 1
ai_generated: true
summary: "Check for common errors and best practices."
---

<!-- planemo-cli-meta: BEGIN auto-generated -->

# `planemo lint`

Check for common errors and best practices.

## Synopsis

```text
planemo lint [OPTIONS] TOOL_PATH
```


## Arguments

| Argument | Type | Required | Help |
|---|---|---|---|
| TOOL_PATH | path | — | — |

## Options

| Option | Type | Default | Required | Help |
|---|---|---|---|---|
| --report_level | choice | all | — | — |
| --report_xunit | path | — | — | Output an XUnit report, useful for CI testing |
| --fail_level | choice | warn | — | — |
| -s, --skip | text | — | — | Comma-separated list of lint tests to skip (e.g. passing --skip 'citations,xml_order' would skip linting of citations and best-practice XML ordering. |
| --skip_file | file | — | — | File containing a list of lint tests to skip |
| -r, --recursive | flag | false | — | Recursively perform command for subdirectories. |
| --urls | flag | false | — | Check validity of URLs in XML files |
| --doi | flag | false | — | Check validity of DOIs in XML files |
| --conda_requirements | flag | false | — | Check tool requirements for availability in best practice Conda channels. |
| --biocontainer, --biocontainers | flag | false | — | Check best practice BioContainer namespaces for a container definition applicable for this tool. |

<!-- planemo-cli-meta: END auto-generated -->
## Output

<!-- Hand-edited. Preserved across `tsx scripts/sync-planemo-cli.ts`. -->

Console output is human-oriented; use the process exit status as the pass/fail gate.

## Examples

<!-- Hand-edited. Preserved across `tsx scripts/sync-planemo-cli.ts`. -->

```sh
planemo lint <tool_dir>
```

## Gotchas

<!-- Hand-edited. Preserved across `tsx scripts/sync-planemo-cli.ts`. -->

No Foundry-specific gotchas recorded yet.
