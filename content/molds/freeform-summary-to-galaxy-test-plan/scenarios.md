# freeform-summary-to-galaxy-test-plan scenarios

Concrete cases for `freeform-summary-to-galaxy-test-plan`, exercised against the
abstract properties in `eval.md`. Each case binds a fixture and states its
expected values; the `eval.md` oracle is applied to whatever the case produces.

## Case: schema-valid synthesized test plan

- fixture: a paper- or interview-derived free-form summary plus the freeform-to-Galaxy interface and data-flow briefs for the same workflow.
- expect: emits a YAML Galaxy workflow test plan that validates against [[galaxy-workflow-test-plan]] via `foundry validate-galaxy-workflow-test-plan`.

## Case: synthesized provenance marked

- fixture: a free-form summary whose "expected results" are prose (e.g. "the workflow produces a clustered AnnData and a UMAP plot") with one concrete value (a named cluster-count token).
- expect: `source.derived_from: intent`; the prose-derived assertions carry `evidence: intent` with `confidence: medium`/`low`; the one concrete token is recorded as `expected_value` with higher confidence.

## Case: label and fixture assumptions explicit

- fixture: a free-form summary that names input data only by description (e.g. "10x single-cell reads") with no URL, plus an interface brief that pins output labels.
- expect: output assertions bind to the brief's labels with `label_status: assumed` and `workflow.label_source: interface-brief`; the input fixture carries `storage: unresolved`, `location: null`, and a `provenance` note; a `blocking` `unresolved[]` entry records the missing fixture.

## Case: plan-not-final-tests boundary

- fixture: cast skill output for the single-cell or a small genomics free-form summary.
- expect: output describes a Galaxy workflow test plan, not concrete `tests-format` YAML; assertion intent references families such as `has_text`, `has_h5_keys`, or `has_size` by name with rationale.

## Case: implementable assertion intent

- fixture: a synthesized Galaxy workflow test plan for the single-cell summary.
- expect: assertion intent is specific enough for [[implement-galaxy-workflow-test]] to materialize Planemo-runnable tests after reconciling labels against the real draft, without re-reading the free-form summary.

## Case: weak outputs handled deliberately

- fixture: a free-form summary whose only described output is a stochastic plot, alongside a data-flow brief that exposes an intermediate table checkpoint.
- expect: the plan records assertion intent against the table checkpoint and lists the plot in `omissions[]` with a `nondeterministic`/`weak-output` rationale, rather than asserting only the plot.
