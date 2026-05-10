---
type: cli-tool
tool: cwltool
origin: pypi
package: cwltool
invoke: cwltool
invoke_fallback: "uvx cwltool"
availability_check: "cwltool --version"
docs_url: "https://cwltool.readthedocs.io/"
tags:
  - cli-tool
  - cli/cwltool
status: draft
created: 2026-05-10
revised: 2026-05-10
revision: 1
ai_generated: true
summary: "Reference CWL runner and validator. Used by summarize-cwl for entrypoint validation."
---

# cwltool

Reference implementation of the Common Workflow Language standard. The Foundry uses it for entrypoint validation (`cwltool --validate`) before normalization; runtime execution is out of scope for current Molds.

## Install

`uvx cwltool` runs cwltool in an ephemeral environment without a project venv. For repeat use, `uv tool install cwltool` puts the binary on PATH.

Fallback without uv: `pip install cwltool` (in a venv).

## Notes

- Validation is structural, not behavioral. A workflow that validates may still fail under execution.
- The Foundry pairs `cwltool --validate` with `cwl-utils cwl-normalizer` for downstream extraction — the normalized JSON is the preferred surface.
