# @galaxy-foundry/gxwf-foundry

Galaxy Workflow Foundry CLI. Produces and validates Mold IO artifacts (summaries, recommendations, test files) from a single `foundry` bin.

## Status

`v0.1.0` — initial public release.

## Install

```sh
npm install -g @galaxy-foundry/gxwf-foundry
# or, ephemeral:
npx --package @galaxy-foundry/gxwf-foundry foundry --help
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
foundry validate-markdown <schema> <document.md>   # shared section schemas
foundry validate-workflow-brief <brief.md>         # experimental RFC/WIP
```

`summarize-nextflow` wraps `@galaxy-foundry/summarize-nextflow`. The validators exit `0` for valid input, `3` for schema-validation failure, and `1` for input errors (missing file, malformed JSON/YAML).

## Library use

The same validators are exported as plain functions for TS consumers:

```ts
import { summaryCwlValidator } from "@galaxy-foundry/gxwf-foundry";

const { valid, errors } = summaryCwlValidator.validate(data);
```

Schema JSON is reachable via sub-path exports: `@galaxy-foundry/gxwf-foundry/schemas/summary-cwl.json` etc.

CLI metadata (program/command/option shape) is exported as static data from `@galaxy-foundry/gxwf-foundry/meta`:

```ts
import { foundryCliMeta } from "@galaxy-foundry/gxwf-foundry/meta";
```

Browser-safe; no commander or node-only deps.

The shared Markdown API accepts declarative section schemas:

```ts
import { validateMarkdownDocument, workflowBriefSchema } from "@galaxy-foundry/gxwf-foundry";

const { valid, errors } = validateMarkdownDocument(markdown, workflowBriefSchema);
```

`MarkdownDocumentSchema` declares heading matching, minimum/maximum counts, nonempty content, and nested sections. The same parser backs Foundry's build checks for CLI pages, evals, and scenarios. `markdownDocumentSchemas` exposes the built-in declarations; library callers can also supply custom schemas. See [the declaration format](../../content/research/markdown-document-contract/index.md).

## Schema sources

The experimental Markdown Workflow Brief records scope, constraints, intended environments, acceptance criteria, and workflow-specific learning. Exported types describe the parsed Markdown title and sections; `workflowBriefSchema` declares the required headings. The validator checks section presence, uniqueness, content, and the Scope/Environment subsections. Approval, runtime preflight, and stage readiness remain follow-up work. See [the definition](../../content/research/workflow-brief-design/index.md).

- `summary-cwl`, `galaxy-tool-discovery`, `galaxy-tool-summary` — Foundry-authored, JSON in `src/schemas/<name>/`.
- `tests-format` — vendored from `@galaxy-tool-util/schema`; refresh via `pnpm sync`.
- `summary-nextflow` lives in the producing package (`@galaxy-foundry/summarize-nextflow`); foundry imports it as a peer.

## License

MIT.
