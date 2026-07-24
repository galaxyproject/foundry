---
type: cli-command
tool: foundry
command: summarize-nextflow
package: "@galaxy-foundry/foundry"
upstream: "https://github.com/galaxyproject/foundry/blob/main/packages/foundry/src/program.ts"
tags:
  - cli/foundry
status: draft
created: 2026-05-11
revised: 2026-05-11
revision: 1
ai_generated: true
summary: "Statically introspect a Nextflow / nf-core pipeline tree and emit a validated JSON summary."
related_notes:
  - "[[summary-nextflow]]"
---

# `foundry summarize-nextflow`

Build a [[summary-nextflow]] JSON document from a Nextflow / nf-core pipeline source tree or git URL. Wraps the standalone `@galaxy-foundry/summarize-nextflow` library so consumers can install one bin (`foundry`) instead of two.

## Output

Default emits the summary JSON to stdout. `--out <path>` writes it to a file instead. Schema validation runs by default; suppress with `--no-validate`.

## Examples

```bash
foundry summarize-nextflow ./nf-core-rnaseq --profile test --out summary.json
foundry summarize-nextflow https://github.com/nf-core/rnaseq --pin 3.14.0
foundry summarize-nextflow ./pipeline --no-with-nextflow --no-validate
```

## Gotchas

- `--no-with-nextflow` disables the Nextflow shell-out and falls back to static parsing only. The summary is less complete but the command still produces a schema-valid document.
- Schema validation failures exit `3` and print AJV diagnostics to stderr; input errors (missing file, malformed config) exit `1`.
- `--fetch-test-data` does real I/O against pipeline-declared test data URLs; expect long runs on first invocation. Pair with `--test-data-dir` to keep fetched data out of the working tree.
