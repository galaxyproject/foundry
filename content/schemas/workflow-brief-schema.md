---
type: schema
name: workflow-brief
title: Workflow Brief Markdown Schema
package: '@galaxy-foundry/gxwf-foundry'
package_export: workflowBriefSchema
validator_bin: foundry
validator_subcommand: validate-workflow-brief
tags:
  - meta
status: draft
created: '2026-09-17'
revised: '2026-09-21'
revision: 1
summary: Markdown section declaration and structural validator for the workflow-brief handoff.
---

# Workflow Brief Markdown Schema

The package export `workflowBriefSchema` declares the required Markdown sections for a Workflow Brief. Casting copies the declaration into a schema sidecar and records `foundry validate-workflow-brief` as its artifact validator.

See [[workflow-brief-design]] for the document definition and [[markdown-document-contract]] for the shared declaration format. Structural validation accepts a brief with blockers so it can be reviewed. The harness separately runs `foundry check-workflow-brief` and stops before implementation on declared blockers; expert review and current preflight are also required.
