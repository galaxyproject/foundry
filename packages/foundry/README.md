# @galaxy-foundry/foundry

Galaxy Workflow Foundry CLI. Produces and validates Mold IO artifacts (summaries, recommendations, test files) from a single `foundry` bin.

## Status

`v0.1.0` — initial public release.

## Install

```sh
npm install -g @galaxy-foundry/foundry
# or, ephemeral:
npx --package @galaxy-foundry/foundry foundry --help
```

Requires Node.js >= 20.

## Subcommands

```sh
foundry summarize-nextflow <path-or-url> [options]   # produce + validate
foundry validate-summary-nextflow <summary.json>
foundry validate-summary-cwl <summary.json>
foundry validate-galaxy-tool-discovery <recommendation.json>
foundry validate-galaxy-tool-summary <manifest.json>
foundry validate-tests-format <tests.yml> [--workflow <wf>] [--json]
```

`summarize-nextflow` wraps `@galaxy-foundry/summarize-nextflow`. The validators exit `0` for valid input, `3` for schema-validation failure, and `1` for input errors (missing file, malformed JSON/YAML).

## Library use

The same validators are exported as plain functions for TS consumers:

```ts
import { summaryCwlValidator } from "@galaxy-foundry/foundry";

const { valid, errors } = summaryCwlValidator.validate(data);
```

Schema JSON is reachable via sub-path exports: `@galaxy-foundry/foundry/schemas/summary-cwl.json` etc.

CLI metadata (program/command/option shape) is exported as static data from `@galaxy-foundry/foundry/meta`:

```ts
import { foundryCliMeta } from "@galaxy-foundry/foundry/meta";
```

Browser-safe; no commander or node-only deps.

## Schema sources

- `summary-cwl`, `galaxy-tool-discovery`, `galaxy-tool-summary` — Foundry-authored, JSON in `src/schemas/<name>/`.
- `tests-format` — vendored from `@galaxy-tool-util/schema`; refresh via `pnpm sync`.
- `summary-nextflow` lives in the producing package (`@galaxy-foundry/summarize-nextflow`); foundry imports it as a peer.

## License

MIT.
