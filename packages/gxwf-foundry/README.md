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
foundry check-workflow-brief <brief.md> [--json]    # exit 4 for declared blockers
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

The experimental Markdown Workflow Brief separates `Workflow` intent from the `Agent Environment`. Most detail is optional; the workflow needs an objective. Agents writing the brief must not infer Galaxy design choices. `workflowBriefSchema` declares the section contract, and `checkWorkflowBrief` additionally reports nonempty Blockers under either parent. The readiness CLI exits `4` for declared blockers, `3` for structural failures, `1` for input failures, and `0` for a clear static check. Design and implementation treat the brief as input and record progress or recommended changes in a separate ledger. See [the definition](../../content/research/workflow-brief-design/index.md).

- `summary-cwl`, `galaxy-tool-discovery`, `galaxy-tool-summary` — Foundry-authored, JSON in `src/schemas/<name>/`.
- `tests-format` — vendored from `@galaxy-tool-util/schema`; refresh via `pnpm sync`.
- `summary-nextflow` lives in the producing package (`@galaxy-foundry/summarize-nextflow`); foundry imports it as a peer.

## License

MIT.
