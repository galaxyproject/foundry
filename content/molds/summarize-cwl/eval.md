# summarize-cwl eval

Evaluation plan for the `summarize-cwl` Mold and its eventual CLI or generated
skill implementation. Fixtures are pinned in `workflow-fixtures/fixtures.yaml`;
materialize with `make fixtures-cwl` before running.

## Case: official user-guide simple workflow validates

- bucket: schema
- check: deterministic
- fixture: `workflow-fixtures/cwl/common-workflow-language__user_guide/src/_includes/cwl/workflows/1st-workflow.cwl`
- expectation: validates with `cwltool --validate`, normalizes successfully with
  `cwl-normalizer`, emits
  `summary-cwl.json`, and passes `validate-summary-cwl`.
- assertions: workflow inputs, workflow outputs, step ids, command tool
  references, and graph edges are populated.

## Case: official user-guide scatter workflow records scatter

- bucket: fidelity
- check: deterministic
- fixture: `workflow-fixtures/cwl/common-workflow-language__user_guide/src/_includes/cwl/workflows/scatter-workflow.cwl`
- expectation: summary validates and at least one step records `scatter[]` plus
  `scatter_method`.
- assertions: graph edges that feed scattered step inputs include a `scatter`
  marker.

## Case: official user-guide nested workflow preserves boundary

- bucket: fidelity
- check: deterministic
- fixture: `workflow-fixtures/cwl/common-workflow-language__user_guide/src/_includes/cwl/workflows/nestedworkflows.cwl`
- expectation: summary validates and preserves the nested workflow boundary as
  a `run_class: "Workflow"` step.
- assertions: warnings identify downstream expansion only when Galaxy
  translation needs it; the summarizer does not flatten blindly.

## Case: cwl v1.2 conditional workflow records when

- bucket: fidelity
- check: deterministic
- fixture: `workflow-fixtures/cwl/common-workflow-language__cwl-v1.2/tests/conditionals/cond-wf-001.cwl`
- expectation: summary validates and records `when` expressions verbatim.
- assertions: conditional edges or step warnings mark the Galaxy review pressure
  without executing JavaScript.

## Case: cross-document run references resolve

- bucket: fidelity
- check: deterministic
- fixture: `workflow-fixtures/cwl/common-workflow-language__user_guide/src/_includes/cwl/workflows/1st-workflow.cwl`
  (depends on sibling `tar-param.cwl` and `arguments.cwl`)
- expectation: normalization gathers referenced documents; summary validates
  and `tools[]` contains entries for both referenced CommandLineTools, not
  unresolved `run:` strings.
- assertions: `documents.normalized_path` is populated; every `steps[].run`
  resolves to an id present in `tools[]`; no warnings claim the referenced
  documents were missing.

## Case: cwl v1.2 step input shape fields survive

- bucket: fidelity
- check: deterministic
- fixture: one normalized workflow from `workflow-fixtures/cwl/common-workflow-language__cwl-v1.2/tests/`
  containing `valueFrom`, `linkMerge`, `pickValue`, or step-input defaults.
- expectation: summary validates and preserves `source`, `default`,
  `value_from`, `link_merge`, and `pick_value` on `steps[].in[]`.
- assertions: absent `source` is represented as `null`, not as a fabricated
  edge.
