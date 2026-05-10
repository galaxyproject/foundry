---
type: cli-tool
tool: planemo
origin: pypi
package: planemo
invoke: planemo
invoke_fallback: "uvx planemo"
availability_check: "planemo --version"
docs_url: "https://planemo.readthedocs.io/"
tags:
  - cli-tool
  - cli/planemo
status: draft
created: 2026-05-10
revised: 2026-05-10
revision: 1
ai_generated: true
summary: "Galaxy tool/workflow runtime testing CLI; used by run-workflow-test and friends."
---

# planemo

Galaxy's runtime testing and authoring CLI. The Foundry's Molds invoke `planemo test`, `planemo lint`, and related subcommands for end-to-end workflow validation.

## Install

`uvx planemo` runs ephemerally; `uv tool install planemo` puts it on PATH. Fallback: `pip install planemo` inside a venv.
