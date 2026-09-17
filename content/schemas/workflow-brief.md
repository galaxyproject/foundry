---
type: schema
name: workflow-brief
title: "[RFC/WIP] Workflow Brief"
package: "@galaxy-foundry/gxwf-foundry"
package_export: "workflowBriefSchema"
validator_bin: foundry
validator_subcommand: validate-workflow-brief
upstream: "https://github.com/galaxyproject/foundry/blob/main/packages/gxwf-foundry/src/schemas/workflow-brief/workflow-brief.schema.json"
license: MIT
tags:
  - meta
status: draft
created: 2026-09-17
revised: 2026-09-17
revision: 1
summary: "RFC/WIP structural YAML contract for a Workflow Brief; agent-written rough draft awaiting GitHub review."
---

# [RFC/WIP] Workflow Brief

**Agent-written rough draft for review on GitHub.** See [issue #563](https://github.com/galaxyproject/foundry/issues/563) and [[workflow-brief-design]] for the proposed definition, lifecycle, and review questions.

The YAML brief records scope, constraints, intended authoring and execution environments, acceptance criteria, unresolved questions, expert decisions, and attempt learning. Existing detailed design and test handoffs remain linked artifacts.

Validate a document with:

```sh
foundry validate-workflow-brief workflow-brief.yml
```

The canonical JSON Schema lives in `packages/gxwf-foundry/src/schemas/workflow-brief/`. Package sync generates both its runtime wrapper and the exported `WorkflowBrief` TypeScript declaration. An illustrative fixture lives at `packages/gxwf-foundry/test/fixtures/workflow-brief/read-alignment.yml`.

This command checks structure only. It does not verify source availability, evidence references, stage readiness, approval, or runtime capabilities. Explicit unknowns and unresolved questions remain valid during drafting.
