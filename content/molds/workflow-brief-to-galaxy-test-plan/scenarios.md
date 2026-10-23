# workflow-brief-to-galaxy-test-plan scenarios

## Case: schema-valid synthesized test plan

- fixture: a reviewed Workflow Brief plus its Galaxy interface/data-flow briefs and optional paper or interview evidence.
- expect: emits a YAML Galaxy workflow test plan that validates against [[galaxy-workflow-test-plan]] via `foundry validate-galaxy-workflow-test-plan`.

## Case: synthesized provenance marked

- fixture: a Workflow Brief whose acceptance criteria are prose, plus evidence carrying one concrete expected value.
- expect: `source.derived_from: intent`; the prose-derived assertions carry `evidence: intent` with `confidence: medium`/`low`; the one concrete token is recorded as `expected_value` with higher confidence.

## Case: label and fixture assumptions explicit

- fixture: a Workflow Brief that names input data only by description with no URL, plus an interface brief that pins output labels.
- expect: output assertions bind to the brief's labels with `label_status: assumed` and `workflow.label_source: interface-brief`; the input fixture carries `storage: unresolved`, `location: null`, and a `provenance` note; a `blocking` `unresolved[]` entry records the missing fixture.

## Case: plan-not-final-tests boundary

- fixture: cast skill output for a reviewed single-cell or small-genomics Workflow Brief.
- expect: output describes a Galaxy workflow test plan, not concrete `tests-format` YAML; assertion intent references families such as `has_text`, `has_h5_keys`, or `has_size` by name with rationale.

## Case: implementable assertion intent

- fixture: a synthesized Galaxy workflow test plan for a single-cell Workflow Brief.
- expect: assertion intent is specific enough for [[implement-galaxy-workflow-test]] to materialize Planemo-runnable tests after reconciling labels against the real draft, without re-deriving acceptance criteria from source evidence.

## Case: weak outputs handled deliberately

- fixture: a Workflow Brief whose only required final output is a stochastic plot, alongside a data-flow brief that exposes an intermediate table checkpoint.
- expect: the plan records assertion intent against the table checkpoint and lists the plot in `omissions[]` with a `nondeterministic`/`weak-output` rationale, rather than asserting only the plot.
