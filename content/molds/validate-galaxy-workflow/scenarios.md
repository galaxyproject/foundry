# validate-galaxy-workflow scenarios

Fixtures are the committed review fixtures under
`content/molds/review-galaxy-workflow/examples/`. Each ships the
`galaxy-workflow-validation-result.json` this Mold is expected to produce for
its `starting-galaxy-workflow.gxwf.yml`, so a run is checked against a real
artifact rather than a description of one.

## Case: clean workflow validates with no diagnostics

- fixture: `content/molds/review-galaxy-workflow/examples/clean-passing/starting-galaxy-workflow.gxwf.yml`
- command: `gxwf validate --json starting-galaxy-workflow.gxwf.yml`
- expect: emits `galaxy-workflow-validation-result` with `status: "pass"` and
  `diagnostics: []`, matching that directory's committed
  `galaxy-workflow-validation-result.json`. The harness proceeds to
  [[run-workflow-test]].

## Case: static pass still records the portability risk it cannot settle

- fixture: `content/molds/review-galaxy-workflow/examples/hardcoded-sample-value/starting-galaxy-workflow.gxwf.yml`
- command: `gxwf validate --json starting-galaxy-workflow.gxwf.yml`
- expect: `status: "pass"` with empty `diagnostics[]` — the literal filesystem
  path in `tool_state` is structurally legal — and one `residual_runtime_risks[]`
  entry naming that non-portability, with `settled_by: "workflow-test-result"`.
  A clean structural result is not reported as an all-clear.

## Case: label/test mismatch is out of scope for static validation

- fixture: `content/molds/review-galaxy-workflow/examples/label-test-mismatch/starting-galaxy-workflow.gxwf.yml`
- expect: `status: "pass"`; the mismatch between the test's
  `multiqc_html_report` key and the workflow's promoted `MultiQC Report` output
  is **not** reported as a diagnostic, and instead appears as a
  `residual_runtime_risks[]` entry pointing at `workflow-test-result`. This is
  the validation-versus-runtime boundary: the defect is real and this Mold is
  not the one that finds it.

## Case: a version pin that disagrees with its own tool id fails

- fixture: `content/molds/review-galaxy-workflow/examples/failed-validation/starting-galaxy-workflow.gxwf.yml`
- command: `gxwf validate --json starting-galaxy-workflow.gxwf.yml`
- expect: `status: "fail"` with one `error` diagnostic on
  `steps.aggregate_reports.tool_version`, naming both the declared `1.24.1` and
  the `1.24.1+galaxy0` its `tool_id` encodes, and routing to
  [[implement-galaxy-tool-step]]. `residual_runtime_risks` is empty — a
  structural failure is not also a deferred runtime question.

## Coverage gaps

No committed fixture exercises `status: "not-run"`. That state is declared by the
Mold's output artifact and has no fixture to bind, so no case asserts it yet.
