---
type: cli-tool
tool: foundry
origin: workspace
package: "@galaxy-foundry/foundry"
invoke: foundry
invoke_fallback: "pnpm exec foundry"
availability_check: "pnpm exec foundry --help"
docs_url: "https://github.com/galaxyproject/foundry/blob/main/packages/foundry/README.md"
tags:
  - cli/foundry
status: draft
created: 2026-05-11
revised: 2026-08-29
revision: 2
summary: "Foundry CLI: bundles all Mold IO validators and a summarize-nextflow subcommand."
---

# foundry

Unified Foundry CLI. Subcommands cover every Mold IO validator plus a `summarize-nextflow` wrapper around the standalone `@galaxy-foundry/summarize-nextflow` package. Per-subcommand synopsis, args, and options are rendered from `@galaxy-foundry/foundry/meta`.

## Install

`@galaxy-foundry/foundry` is not published to npm — it is a workspace package of this repository, so there is nothing for `npm install -g` or `npx --package` to fetch. Build it from a Foundry checkout:

```sh
pnpm install && pnpm -r build
```

Then run it as `pnpm exec foundry <subcommand>` from the checkout, or put `node_modules/.bin` on `PATH`. Do not reach for `npx foundry` — an unrelated `foundry` package owns that name on npm. Flip `origin` back to `npm` here when the package is published.
