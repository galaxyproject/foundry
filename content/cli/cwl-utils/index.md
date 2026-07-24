---
type: cli-tool
tool: cwl-utils
origin: pypi
package: cwl-utils
invoke: cwl-normalizer
invoke_fallback: "uvx --from cwl-utils cwl-normalizer"
availability_check: "cwl-normalizer --help"
docs_url: "https://github.com/common-workflow-language/cwl-utils"
tags:
  - cli/cwl-utils
status: draft
created: 2026-05-10
revised: 2026-05-10
revision: 1
ai_generated: true
summary: "CWL document utilities. summarize-cwl uses cwl-normalizer to gather references and upgrade to v1.2 JSON."
---

# cwl-utils

Maintained Python utilities for working with CWL documents. The Foundry's primary entry point is `cwl-normalizer`, which produces a single JSON document with referenced subdocuments gathered and CWL upgraded to v1.2 — the preferred extraction surface for summarize-cwl.

## Install

`uvx --from cwl-utils cwl-normalizer ...` runs a non-default bin in an ephemeral env. `uv tool install cwl-utils` exposes the package's bins on PATH.

Fallback without uv: `pip install cwl-utils`.

## Notes

- The package ships several bins (cwl-normalizer, cwl-graph-split, cwl-docker-extract, ...); the Foundry currently uses cwl-normalizer.
- Normalization is the preferred handoff because it pulls in referenced documents and rewrites references — downstream Molds extract from regular JSON.
