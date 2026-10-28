---
type: research
title: "Binding a workflow step to a user-defined tool"
tags:
  - target/galaxy
status: draft
created: 2026-09-24
revised: 2026-10-26
revision: 5
related_notes:
  - "[[galaxy-user-tool-authoring-help]]"
  - "[[galaxy-user-tool-authoring]]"
  - "[[galaxy-workflow-draft-format]]"
  - "[[gxformat2-schema]]"
  - "[[planemo-workflow-test-architecture]]"
related_molds:
  - "[[author-galaxy-tool-wrapper]]"
  - "[[implement-galaxy-tool-step]]"
  - "[[advance-galaxy-draft-step]]"
  - "[[run-workflow-test]]"
sources:
  - "https://github.com/galaxyproject/galaxy/blob/5af1d03c929748006dd53ad451e5cb1fd140399a/client/src/components/Tool/authoringHelp.yml"
  - "https://github.com/galaxyproject/galaxy/blob/5af1d03c929748006dd53ad451e5cb1fd140399a/lib/galaxy/managers/tools.py"
  - "https://github.com/galaxyproject/galaxy/blob/5af1d03c929748006dd53ad451e5cb1fd140399a/lib/galaxy/webapps/galaxy/api/dynamic_tools.py"
  - "https://github.com/galaxyproject/galaxy/blob/5af1d03c929748006dd53ad451e5cb1fd140399a/lib/galaxy_test/workflow/inline_user_defined_tool.gxwf.yml"
  - "https://github.com/galaxyproject/galaxy/blob/5af1d03c929748006dd53ad451e5cb1fd140399a/lib/galaxy/schema/schema.py"
summary: "How a workflow step uses an authored GalaxyUserTool: embedded under run:, never by tool_uuid, tool_id or content_id; registering via /api/unprivileged_tools."
---

A gxformat2 step that uses an authored `GalaxyUserTool` carries the whole tool definition under its `run:` key. That is the only way the Foundry binds a step to a user-defined tool.

A step never names a user-defined tool by `tool_uuid`, `tool_id`, or `content_id` alone. The tool is not in a server's toolbox, so a `tool_id` does not resolve to it, even when the string matches the tool's `id`. A `uuid` identifies one registered copy of the tool, for its owner, on one server. Galaxy's workflow editor and its exports write any such references themselves, and Galaxy rejects a `tool_uuid` step without an embedded definition whose `tool_id` names a different tool.

The rule is derived from the `workflows` section ("Using a tool in a workflow") of Galaxy's authoring help, vendored in [[galaxy-user-tool-authoring-help]]. The Galaxy-side facts below are pinned to the same commit. The gxwf behavior was checked with `@galaxy-tool-util/cli` 1.14.0, the version the Foundry pins.

## Embedding the definition in a gxformat2 step

The embedded form makes the workflow self-contained. When a user imports it, Galaxy registers a private copy of the tool for that user. That requires a server with `enable_beta_tool_formats` set and a user holding the `Custom Tool Execution` role, the same conditions as registering the tool directly. Through the API, that role is created with `role_type: user_tool_execute`. Galaxy checks for the role on every user, admins included. Converting the workflow to native `.ga` with gxformat2 carries the definition as `tool_representation`, with no `tool_id`, `tool_version`, or `tool_uuid`, and Galaxy imports that form the same way. Galaxy's own `.ga` export also includes the definition as `tool_representation`. Nothing has to be registered first, and nothing has to be injected into the converted file afterwards.

To bind a step:

- Put the complete `GalaxyUserTool` document under `run:`, unchanged. Its `id` and `version` identify the tool.
- Leave out `tool_id`, `tool_version`, and `tool_shed_repository`. They describe toolbox tools. Remove any `TODO` sentinel the template left in those fields rather than filling it.
- Key `in:` by the names of the definition's `data` and `collection` inputs.
- List every output a downstream step or a workflow output uses under `out:`, by the definition's output `name`.
- Set values for non-data inputs in `state`, keyed by input `name`.

```yaml
steps:
  head:
    run:
      class: GalaxyUserTool
      id: head_lines
      version: 0.1.0
      name: Head lines
      container: quay.io/biocontainers/python:3.13
      shell_command: head -n '$(inputs.n_lines)' '$(inputs.data_input.path)' > out.txt
      inputs:
        - name: n_lines
          type: integer
          value: 10
        - name: data_input
          type: data
          format: [txt]
      outputs:
        - name: out
          type: data
          format: txt
          from_work_dir: out.txt
    in:
      data_input: text_file
    out:
      - id: out
    state:
      n_lines: 5
```

gxformat2's converter turns that step into a native tool step whose `tool_state` contains `n_lines: 5`, with the definition in `tool_representation`. Galaxy's own test workflow `inline_user_defined_tool.gxwf.yml` exercises the same form end to end, without `out:` or `state`.

## Validating a draft with an embedded tool

gxwf treats a `GalaxyUserTool` under `run:` as a tool step. [[draft-validate]] with and without `--concrete`, [[draft-next-step]], [[draft-extract]], and `gxwf validate` on the extracted workflow all run as they do for toolbox steps, and `draft-extract` keeps workflow outputs sourced from the embedded step even without an `out:` list. `gxwf validate-tool-source <file>` validates the definition itself when it is saved as a separate file.

## Registering a tool on a server

A step that embeds its tool does not need it registered. Registering is for running the tool by itself, outside a workflow, or for binding a native `.ga` step by `tool_uuid`.

- Register with `POST /api/unprivileged_tools`, body `{"representation": <the GalaxyUserTool document>}`. It needs the same `enable_beta_tool_formats` setting and `Custom Tool Execution` role as importing an embedded step, and returns the registered copy's `uuid`. The `api` section of [[galaxy-user-tool-authoring-help]] lists the other endpoints.
- Do not use `POST /api/dynamic_tools`. It is admin-only and returns 403 for an ordinary user.
- A returned `uuid` means Galaxy accepted the definition, not that the tool runs. Run it on test data before reporting it as working.

## Testing a workflow with an embedded tool

A Planemo-managed Galaxy cannot test such a workflow. Planemo fails with `KeyError: 'tool_id'` before Galaxy starts ([galaxyproject/planemo#1757](https://github.com/galaxyproject/planemo/issues/1757)), and its test user lacks the `Custom Tool Execution` role, so the import would return HTTP 403 even past that crash. Testing against a Galaxy served by Planemo, with beta tool formats enabled and a user holding the role, does work. [[planemo-workflow-test-architecture]] gives the commands.
