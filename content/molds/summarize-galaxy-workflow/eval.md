# summarize-galaxy-workflow eval

Abstract oracle for the summary emitted from an existing Galaxy workflow. Fixture-bound cases live in the pipeline's `scenarios.md`.

## Property: the summary validates against its schema

- check: deterministic
- assertion: the emitted JSON passes `foundry validate-summary-galaxy-workflow`, including `additionalProperties: false` at every level.

## Property: every step and connection in the source appears

- check: deterministic
- assertion: `steps[]` has one entry per gxformat2 step and `graph.edges[]` covers every input connection; no step present in the source workflow is silently dropped from the summary.

## Property: labels are preserved verbatim

- check: llm-judged
- assertion: step labels, workflow-input labels, and workflow-output names match the source workflow exactly. A renamed, re-cased, or singular/plural-shifted label is a failure, because the change-set anchors edits to these strings.

## Property: tool identity and state are recorded faithfully

- check: llm-judged
- assertion: each tool step's `tool_id`, `tool_version`, and `tool_state` reflect the source verbatim; `tool_state` is not summarized away or normalized in a way that loses a parameter an edit might target. Invented Tool Shed ids or versions are a failure.

## Property: output post-job actions survive, not just names

- check: llm-judged
- assertion: each step output is recorded as `out[].{id, actions}` with the source's gxformat2 post-job actions (`hide`, `rename`, `add_tags`, …) preserved verbatim in `actions` (`null` only when the output truly has none). A hidden output whose only signal is a `hide` action — one not promoted to `workflow_outputs` — is still visible in the summary; flattening `out` to bare names, or dropping a `hide`/`rename`, is a failure because an expose/rename change-set would lose its anchor.

## Property: `.ga` conversion is recorded and flagged when lossy

- check: deterministic
- assertion: a `.ga` input yields `original_format: ga` and a populated `documents.converted_path`; any structure the conversion drops or rewrites surfaces in `warnings[]` rather than being presented as clean.

## Property: existing tests are captured, not fabricated

- check: llm-judged
- assertion: `tests[]` reflects only tests actually present (sibling `*-tests.yml` or embedded); when none exist it is `[]`. Expected outputs are never inferred from tool names.
