# advance-galaxy-draft-step eval

## Case: single iteration advances exactly one step

- check: llm-judged
- fixture: gxformat2 draft with two or more drafty tool steps (`TODO_*` + `_plan_*`) and a fully concrete topology.
- expectation: one invocation of the cast skill picks the [[draft-next-step]] result, resolves a wrapper, implements that one step, and runs [[draft-validate]] `--concrete`. Untouched steps remain drafty; the chosen step is concrete.

## Case: loop terminates on draft: false

- check: llm-judged
- fixture: gxformat2 draft with every step already concrete (no `TODO_*`, no `_plan_*`).
- expectation: the cast skill detects `draft: false` from [[draft-next-step]] and returns without invoking discover-or-author, summarize, or implement.

## Case: discover-or-author fallthrough

- check: llm-judged
- fixture: draft step whose `_plan_*` describes behavior that has no acceptable Tool Shed candidate.
- expectation: [[discover-shed-tool]] returns no match; the skill falls through to [[author-galaxy-tool-wrapper]] rather than guessing a wrapper.

## Case: --concrete failure routes to the right surface

- check: llm-judged
- fixture: draft + tool summary that causes [[draft-validate]] `--concrete` to fail with a wrapper-choice mismatch (datatype, collection shape, or missing parameter).
- expectation: the skill classifies the failure per the failure-routing rules in `index.md` and re-enters wrapper resolution, not step implementation.
