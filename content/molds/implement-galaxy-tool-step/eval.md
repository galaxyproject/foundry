# implement-galaxy-tool-step eval

This file is the **abstract oracle**: properties any run of `implement-galaxy-tool-step` must satisfy, independent of fixture. Concrete fixtures and their expected values live in `scenarios.md`; the oracle here is applied to whatever a scenario produces.

## Property: concrete step preserves failure evidence

- check: llm-judged
- assertion: implements the step without erasing failure evidence needed later, including tool id, input labels, output labels, collection shape, and any wrapper failure semantics relevant to runtime debugging.

## Property: runtime failure ownership hint

- check: llm-judged
- assertion: records whether a later failure should be investigated as tool/job failure, data-flow mistake, template wiring mistake, wrapper mismatch, or test/assertion issue.

## Property: a Tool Shed step names its tool by full versioned id

- check: deterministic
- assertion: every implemented step whose `tool_id` starts with a Tool Shed host has the form `<shed>/repos/<owner>/<repo>/<tool>/<version>`, and that last segment equals the step's `tool_version`. A versionless shed id is a failure even when draft-validate passes, because exact-version invocation rejects it.

## Property: an authored user-defined tool is embedded, never referenced by id or uuid

- check: deterministic
- assertion: a step implemented from a `galaxy-user-tool-definition` carries a `run:` whose `class` is `GalaxyUserTool` and whose `id` and `version` match the authored definition, and no step in the draft names an authored tool by `tool_uuid`, `tool_id`, or `content_id` instead of embedding it.

## Property: rename values use post-job action syntax

- check: llm-judged
- assertion: every `rename:` on a step output uses `#{input}` for an input's dataset name and `${label}` only for a declared workflow parameter input; a tool-XML label variable such as `${on_string}` or `${tool.name}` in a rename is a failure, because Galaxy treats it as an untyped run-time parameter, not the input's name.
