---
type: research
title: "Galaxy user-defined tool authoring help"
tags:
  - target/galaxy
status: draft
created: 2026-09-24
revised: 2026-10-23
revision: 4
license: MIT
license_file: LICENSES/galaxy.LICENSE
related_notes:
  - "[[galaxy-user-tool-authoring]]"
  - "[[galaxy-user-tool-workflow-binding]]"
sources:
  - "https://github.com/galaxyproject/galaxy/blob/5af1d03c929748006dd53ad451e5cb1fd140399a/client/src/components/Tool/authoringHelp.yml"
companions:
  - "galaxy-user-tool-authoring-help.yml"
summary: "Vendored Galaxy authoring guidance for user-defined tools: tool format, expressions, containers, API endpoints, and use in workflows."
---

> **Vendored from upstream**, pinned at SHA `5af1d03` on `release_26.1`, after [galaxyproject/galaxy#23694](https://github.com/galaxyproject/galaxy/pull/23694) merged. One file lives next to this note and is declared in `companions:` so casting carries it with the note:
>
> - `galaxy-user-tool-authoring-help.yml` — Galaxy's single source of truth for `GalaxyUserTool` authoring guidance (`client/src/components/Tool/authoringHelp.yml`). Galaxy renders it twice: as the help panel in the tool editor and as the generated `user_defined_tools_authoring` page of the Galaxy docs. Sync is manual.
>
> **When to consult:** as the upstream source for [[galaxy-user-tool-workflow-binding]], which derives the Foundry's step-binding rule from the file's `workflows` section, and for the endpoint table in its `api` section.

## Reading the file

The file is a list of `sections`, each with an `id`, a `title`, a `kind`, and a CommonMark `body`. Some bodies contain placeholders (`{{quick_start_example}}`, `{{parameter_type_index}}`, `{{validator_type_index}}`, `{{output_type_index}}`). Sections with `parameter_types`, `output_types`, or `validator_types` set are filled from Galaxy's tool source schema at render time. Neither the placeholders nor those sections are expanded here, so the per-type field tables are not in this copy. Links use Galaxy's own `gxdoc:`, `gxui:`, and `gxhelp://` targets and do not resolve outside Galaxy.

The sections the Foundry reads:

- `workflows` ("Using a tool in a workflow") — how a format2 workflow step embeds a user-defined tool under `run`. [[galaxy-user-tool-workflow-binding]] is derived from it.
- `api` ("API endpoints") — the `/api/unprivileged_tools` endpoints, the create payload shape, and running a registered tool by `tool_uuid`.
- `validation`, `testing` — what Galaxy checks when a tool is created, and that Galaxy stores declared tool tests but does not run them for a tool held in its database.

The field-level rules in `tool-format`, `parameters`, `outputs`, `expressions`, and `containers` overlap [[galaxy-user-tool-authoring]], which was derived earlier from Galaxy's generator prompts. That note remains what [[author-galaxy-tool-wrapper]] loads.
