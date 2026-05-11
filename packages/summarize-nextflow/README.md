# @galaxy-foundry/summarize-nextflow

Statically introspect a Nextflow / nf-core pipeline tree and emit a JSON summary.

Source-specific (Nextflow), target-agnostic. The summary is the input to downstream Galaxy / CWL translation tooling. The output schema (`summaryNextflowSchema`) ships in this package at `src/schema/summary-nextflow.schema.json` and is exported alongside an AJV-backed `validateSummary()`.

## Status

`v0.1.0` — initial public release. Local pipeline paths are supported; git URLs and `--pin` still exit with code `64` while remote checkout support is pending. See `content/molds/summarize-nextflow/` and the Nextflow component research notes for design context.

Most consumers should install [`@galaxy-foundry/foundry`](https://www.npmjs.com/package/@galaxy-foundry/foundry) instead, which ships `summarize-nextflow` as a subcommand alongside the validators.

## Install

```sh
npm install -g @galaxy-foundry/summarize-nextflow
# or, ephemeral:
npx --package @galaxy-foundry/summarize-nextflow summarize-nextflow <pipeline-path-or-url> [options]
```

Requires Node.js >= 20.

## Usage

```sh
summarize-nextflow <path-or-url> \
  [--profile=test] \
  [--pin=<sha-or-tag>] \
  [--out=summary.json] \
  [--no-with-nextflow] \
  [--fetch-test-data] \
  [--test-data-dir=<dir>] \
  [--mulled-index-path=<multi-package-containers.tsv>] \
  [--no-validate]
```

### Optional Nextflow integration

When `nextflow` is on PATH, `summarize-nextflow` shells out to `nextflow inspect -format json` and `nextflow config -flat` for fields only Groovy can resolve (per-process container under a profile, fully merged config). Pass `--no-with-nextflow` to force pure static parsing. See `content/research/external-tool-nextflow-inspect.md`.

## Output contract

JSON to stdout (or `--out=`). Stderr is human-readable progress. Exit codes:

- `0` — success
- `1` — input error (missing path, bad URL)
- `2` — resolution failure (network, missing dependency)
- `3` — schema validation failure
- `64` — not yet implemented

## License

MIT.
