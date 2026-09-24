---
type: research
title: "Binding a workflow step to a user-defined tool"
tags:
  - target/galaxy
status: draft
created: 2026-09-24
revised: 2026-09-24
revision: 3
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
  - "https://github.com/mvdbeek/galaxy/blob/c74e78f165e9089628ebce69c112e9d9b35e6599/client/src/components/Tool/authoringHelp.yml"
  - "https://github.com/mvdbeek/galaxy/blob/c74e78f165e9089628ebce69c112e9d9b35e6599/lib/galaxy/managers/tools.py"
  - "https://github.com/mvdbeek/galaxy/blob/c74e78f165e9089628ebce69c112e9d9b35e6599/lib/galaxy_test/workflow/inline_user_defined_tool.gxwf.yml"
summary: "How a Foundry workflow step uses an authored GalaxyUserTool: the definition embedded under run:, never a tool_uuid, tool_id or content_id reference."
---

A gxformat2 step that uses an authored `GalaxyUserTool` carries the whole tool definition under its `run:` key. That is the only way the Foundry binds a step to a user-defined tool.

A step never names a user-defined tool by `tool_uuid`, `tool_id`, or `content_id` alone. The tool is not in a server's toolbox, so a `tool_id` does not resolve to it, even when the string matches the tool's `id`. A `uuid` identifies one registered copy of the tool, for its owner, on one server. Galaxy's workflow editor and its exports write any such references themselves, and Galaxy rejects a `tool_uuid` step without an embedded definition whose `tool_id` names a different tool.

The rule is derived from the `workflows` section ("Using a tool in a workflow") of Galaxy's authoring help, vendored in [[galaxy-user-tool-authoring-help]]. The Galaxy-side facts below are pinned to the same commit. The gxwf behavior was observed with `@galaxy-tool-util/cli` 1.10.0, the version the Foundry pins, and 1.12.0, the latest release when this was written.

## Embedding the definition in a gxformat2 step

The embedded form makes the workflow self-contained. When a user imports it, Galaxy registers a private copy of the tool for that user. That requires a server with `enable_beta_tool_formats` set and a user holding the `Custom Tool Execution` role, the same conditions as registering the tool directly. Converting the workflow to native `.ga` with gxformat2 carries the definition as `tool_representation`, with no `tool_id`, `tool_version`, or `tool_uuid`, and Galaxy imports that form the same way. Galaxy's own `.ga` export also includes the definition as `tool_representation`. Nothing has to be registered first, and nothing has to be injected into the converted file afterwards.

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
