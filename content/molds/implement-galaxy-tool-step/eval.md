# implement-galaxy-tool-step eval

This file is the **abstract oracle**: properties any run of `implement-galaxy-tool-step` must satisfy, independent of fixture. Concrete fixtures and their expected values live in `scenarios.md`; the oracle here is applied to whatever a scenario produces.

## Property: concrete step preserves failure evidence

- check: llm-judged
- assertion: implements the step without erasing failure evidence needed later, including tool id, input labels, output labels, collection shape, and any wrapper failure semantics relevant to runtime debugging.

## Property: runtime failure ownership hint

- check: llm-judged
- assertion: records whether a later failure should be investigated as tool/job failure, data-flow mistake, template wiring mistake, wrapper mismatch, or test/assertion issue.

## Property: an authored user-defined tool is embedded, never referenced by uuid

- check: deterministic
- assertion: a step implemented from a `galaxy-user-tool-definition` carries a `run:` whose `class` is `GalaxyUserTool` and whose `id` and `version` match the authored definition, and no step in the draft puts a tool `uuid` in `tool_id` or `content_id` or names an authored tool by `tool_id` alone.
