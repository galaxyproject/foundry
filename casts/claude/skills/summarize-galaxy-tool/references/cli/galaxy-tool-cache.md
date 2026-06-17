---
type: cli-tool
tool: galaxy-tool-cache
origin: npm
package: "@galaxy-tool-util/cli"
package_version: "1.7.2"
invoke: galaxy-tool-cache
invoke_fallback: "npx --yes --package @galaxy-tool-util/cli@1.7.2 galaxy-tool-cache"
availability_check: "galaxy-tool-cache --help | grep -q summarize"
docs_url: "https://github.com/jmchilton/galaxy-tool-util-ts/tree/main/packages/cli"
tags:
  - cli-tool
  - cli/galaxy-tool-cache
status: draft
created: 2026-06-16
revised: 2026-06-17
revision: 2
ai_generated: true
summary: "Cache and inspect Galaxy tool metadata (fetch from ToolShed, summarize ParsedTool, export input JSON Schema)."
---

# galaxy-tool-cache

Fetches Galaxy tool metadata from the Tool Shed (or a Galaxy instance), caches the parsed wrapper locally, and inspects it. Bundled with `@galaxy-tool-util/cli` alongside [[gxwf]]; subcommand pages cover individual operations. The cache is the input source for [[summarize-galaxy-tool]] — `summarize` reads an already-cached pin, so populate the cache first with `add` (single pin) or `populate-workflow` (every tool a draft references).

## Install

`npx --yes --package @galaxy-tool-util/cli@1.7.2 galaxy-tool-cache <subcommand>` runs without a global install. For repeat use, `npm install -g @galaxy-tool-util/cli@1.7.2`. The `@1.7.2` pin matches [[gxwf]] (same npm package) and tracks the `^1.7.2` devDependency in the repo `package.json` / `pnpm-lock.yaml`.
