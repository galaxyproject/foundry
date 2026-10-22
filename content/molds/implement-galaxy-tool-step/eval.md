# implement-galaxy-tool-step eval

This file is the **abstract oracle**: properties any run of `implement-galaxy-tool-step` must satisfy, independent of fixture. Concrete fixtures and their expected values live in `scenarios.md`; the oracle here is applied to whatever a scenario produces.

## Property: concrete step preserves failure evidence

- check: llm-judged
- assertion: implements the step without erasing failure evidence needed later, including tool id, input labels, output labels, collection shape, and any wrapper failure semantics relevant to runtime debugging.

## Property: runtime failure ownership hint

- check: llm-judged
- assertion: records whether a later failure should be investigated as tool/job failure, data-flow mistake, template wiring mistake, wrapper mismatch, or test/assertion issue.

## Property: rename values use post-job action syntax

- check: llm-judged
- assertion: every `rename:` on a step output uses `#{input}` for an input's dataset name and `${label}` only for a declared workflow parameter input; a tool-XML label variable such as `${on_string}` or `${tool.name}` in a rename is a failure, because Galaxy leaves it literal in the dataset name.
