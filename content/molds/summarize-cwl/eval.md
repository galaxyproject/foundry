# summarize-cwl eval

Evaluation plan for the `summarize-cwl` Mold and its eventual CLI or generated
skill implementation. This file is the **abstract oracle**: properties any run
must satisfy, independent of fixture. Concrete fixtures and their expected
values live in `scenarios.md`; the oracle here is applied to whatever a scenario
produces. Properties are tagged by bucket:

- **schema** — does the emitted JSON validate?
- **fidelity** — does the JSON faithfully reflect the source CWL?

## Property: valid workflow validates, normalizes, and emits a populated summary

- bucket: schema
- check: deterministic
- assertion: a valid CWL workflow validates with `cwltool --validate`,
  normalizes successfully with `cwl-normalizer`, emits `summary-cwl.json`, and
  passes `validate-summary-cwl`; workflow inputs, workflow outputs, step ids,
  command tool references, and graph edges are populated, never left empty for a
  workflow that has them.

## Property: scatter steps record scatter and scatter_method

- bucket: fidelity
- check: deterministic
- assertion: when a workflow scatters a step, the summary validates and that
  step records `scatter[]` plus `scatter_method`; graph edges that feed
  scattered step inputs carry a `scatter` marker rather than dropping it.

## Property: nested workflow boundary is preserved, not flattened

- bucket: fidelity
- check: deterministic
- assertion: a nested `Workflow` in `run:` is preserved as a `run_class:
  "Workflow"` step; the summarizer does not flatten blindly, and warnings
  identify downstream expansion only when Galaxy translation needs it.

## Property: conditional `when` expressions are recorded verbatim

- bucket: fidelity
- check: deterministic
- assertion: a conditional step records its `when` expression verbatim and marks
  the Galaxy review pressure via conditional edges or step warnings, without
  executing JavaScript.

## Property: cross-document run references resolve into tools[]

- bucket: fidelity
- check: deterministic
- assertion: normalization gathers referenced documents;
  `documents.normalized_path` is populated, every `steps[].run` resolves to an
  id present in `tools[]` rather than an unresolved `run:` string, and no
  warnings claim the referenced documents were missing.

## Property: step-input shape fields survive normalization

- bucket: fidelity
- check: deterministic
- assertion: the summary preserves `source`, `default`, `value_from`,
  `link_merge`, and `pick_value` on `steps[].in[]`; an absent `source` is
  represented as `null`, not as a fabricated edge.
