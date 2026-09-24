---
type: research
title: "Binding a workflow step to a user-defined tool"
tags:
  - target/galaxy
status: draft
created: 2026-09-24
revised: 2026-09-24
revision: 1
related_notes:
  - "[[galaxy-user-tool-authoring-help]]"
  - "[[galaxy-user-tool-authoring]]"
  - "[[galaxy-workflow-draft-format]]"
  - "[[gxformat2-schema]]"
related_molds:
  - "[[author-galaxy-tool-wrapper]]"
  - "[[implement-galaxy-tool-step]]"
  - "[[advance-galaxy-draft-step]]"
sources:
  - "https://github.com/mvdbeek/galaxy/blob/8a55bed837687e4207f20c8f15c146d621e89011/client/src/components/Tool/authoringHelp.yml"
  - "https://github.com/mvdbeek/galaxy/blob/8a55bed837687e4207f20c8f15c146d621e89011/lib/galaxy/managers/tools.py"
  - "https://github.com/mvdbeek/galaxy/blob/8a55bed837687e4207f20c8f15c146d621e89011/lib/galaxy_test/workflow/inline_user_defined_tool.gxwf.yml"
summary: "How a Galaxy workflow step uses a GalaxyUserTool: embedded under run: in gxformat2, tool_uuid in native .ga, never the uuid as tool_id."
---

A gxformat2 step that uses an authored `GalaxyUserTool` carries the whole tool definition under its `run:` key. That is the form every Foundry draft uses. A native `.ga` step may instead name an already-registered tool by `tool_uuid`. No step puts a tool's `uuid` in `tool_id` or `content_id`.

The rule is derived from the `workflows` section ("Using a tool in a workflow") of Galaxy's authoring help, vendored in [[galaxy-user-tool-authoring-help]]. The Galaxy-side facts below are pinned to the same commit. The gxwf behavior was observed with `@galaxy-tool-util/cli` 1.10.0, the version the Foundry pins, and 1.12.0, the latest release when this was written.

## Which form to use

| Situation | Step form |
|---|---|
| A gxformat2 draft or workflow built by the Foundry, with a tool from [[author-galaxy-tool-wrapper]] | Embed the `galaxy-user-tool.yml` document under `run:`. |
| A native `.ga` step that must use a tool already registered on a specific Galaxy server | `tool_uuid` set to the registered tool's `uuid`. `content_id` and `tool_id` equal the tool's own `id`, or are omitted. |
| Any form | Never put the `uuid` in `tool_id` or `content_id`. |

Galaxy rejects a step that references a tool by `tool_uuid` without embedding its definition when the step's `tool_id` names something other than that tool's `id`, including the `uuid` itself. A step that also carries `tool_representation`, as Galaxy's own export does, is exempt from this check and is not rejected, whatever its `tool_id`.

A user-defined tool is not in a server's toolbox, so a step that names one by `tool_id` alone imports with the tool unresolved. That is true even when the `tool_id` string matches a registered tool's `id`.

## Embedding the definition in a gxformat2 step

The embedded form makes the workflow self-contained. When a user imports it, Galaxy registers a private copy of the tool for that user. That requires a server with `enable_beta_tool_formats` set and a user holding the `Custom Tool Execution` role, the same conditions as registering the tool directly. Converting the workflow to native `.ga` with gxformat2 carries the definition as `tool_representation`, with no `tool_id`, `tool_version`, or `tool_uuid`, and Galaxy imports that form the same way. Nothing has to be registered first, and nothing has to be injected into the converted file afterwards.

To bind a step:

- Put the complete `GalaxyUserTool` document under `run:`, unchanged. Its `id` and `version` identify the tool.
- Leave out `tool_id`, `tool_version`, and `tool_shed_repository`. They describe toolbox tools. Remove any `TODO` sentinel the template left in those fields rather than filling it.
- Key `in:` by the names of the definition's `data` and `collection` inputs.
- List every output a downstream step or a workflow output uses under `out:`, by the definition's output `name`. The pinned gxwf needs this list: see "gxwf limits in the pinned version" below.
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

## Referencing a registered tool from a native step

A tool is registered with `POST /api/unprivileged_tools`, which returns its `uuid`. The endpoint is not admin-only. It requires the `Custom Tool Execution` role and a server with `enable_beta_tool_formats` set. The admin-only `POST /api/dynamic_tools` is a different endpoint and not the one to use. The vendored file's `api` section lists the other `/api/unprivileged_tools` endpoints and the create payload.

A `uuid` pins one exact version of the tool. Saving a changed tool gives it a new `uuid`, so a workflow keeps running the old version until its step is updated. Galaxy's own `.ga` export writes `tool_uuid` and also embeds the definition as `tool_representation`, so another user or server that imports the file gets a private copy from the definition.

The Foundry has no step that needs this form. It applies when a harness edits a `.ga` that Galaxy exported, or binds a workflow to a tool someone already registered on a particular server.

## gxwf limits in the pinned version

These are defects in `@galaxy-tool-util` up to the version the Foundry pins, not rules of the step format. Galaxy and gxformat2 accept an embedded step without them. They are fixed in [jmchilton/galaxy-tool-util-ts#185](https://github.com/jmchilton/galaxy-tool-util-ts/pull/185), which is not in a release yet. The guidance below applies to the pinned version. Once the Foundry pins a release containing that fix, this section goes away, along with the validation fallbacks in [[implement-galaxy-tool-step]] and [[advance-galaxy-draft-step]] that point here.

Both gxwf versions tested, 1.10.0 and 1.12.0, treat any object under a step's `run:` as an inlined subworkflow. For a step whose `run:` is a `GalaxyUserTool`:

- `gxwf draft-validate --concrete` and `gxwf validate` with tool-state checks crash with `TypeError: wf.steps is not iterable` and produce no report. The crash is a tooling failure and says nothing about the step.
- `gxwf draft-next-step` works on the draft, and `gxwf validate --no-tool-state` works on the extracted `class: GalaxyWorkflow` file. It rejects a draft for its class.
- `gxwf draft-validate` without `--concrete` and `gxwf draft-extract` give correct results only when the step lists its outputs under `out:`. Without that list, `draft-validate` exits 1, reporting that a workflow output sourced from the step references an unknown port. `draft-extract` exits 0 but drops every workflow output and every downstream step that reads from the step.
- `gxwf validate-tool-source <file>` validates the definition itself when it is saved as a separate file. It checks the definition, not the step that uses it.

Until a fixed gxwf is pinned, a draft containing an embedded step gets no concrete tool-state validation for any of its steps. Run the checks that complete, validate the definition with `validate-tool-source`, and record in the [[open-requirements-ledger]] that concrete tool-state validation did not run.

## Open questions

- `gxwf validate` with tool-state checks, which [[validate-galaxy-workflow]] runs on the extracted workflow, crashes the same way with the pinned gxwf. That Mold does not say so, and needs no change once a fixed gxwf is pinned.
- Whether a Planemo-managed Galaxy runs a workflow with an embedded tool has not been tested. It would need `enable_beta_tool_formats` on that server and the `Custom Tool Execution` role for the test user.
