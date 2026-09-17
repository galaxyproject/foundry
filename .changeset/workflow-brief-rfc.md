---
"@galaxy-foundry/gxwf-foundry": minor
---

Add shared declarative Markdown document schemas and structural validation for build and runtime consumers. Migrate CLI pages, evals, and scenarios to the shared parser, and introduce an experimental Workflow Brief schema and validation commands.

Workflow Briefs separate workflow intent from the agent environment, keep most details optional, and expose a static blocker check through `foundry check-workflow-brief`.
