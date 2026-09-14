# run-workflow-test scenarios

Fixtures are the committed review fixtures under
`content/molds/review-galaxy-workflow/examples/`. Each ships the
`workflow-test-result.json` this Mold is expected to produce, so a run is
checked against a real artifact rather than a description of one.

## Case: passing test preserves the Galaxy handles a debug Mold needs

- fixture: `content/molds/review-galaxy-workflow/examples/clean-passing/`
  (`starting-galaxy-workflow.gxwf.yml` + `galaxy-workflow.gxwf-tests.yml`)
- expect: `status: "pass"` with `planemo_result` `{tests: 1, passed: 1,
  failed: 0, errors: 0}`; `galaxy_mode: "managed"`; `invocation_id` and
  `history_id` both present; `artifacts.test_output_json` names the structured
  Planemo report. No `failure_modality` is set on a pass.

## Case: assertion failure names its modality and next surface

- fixture: `content/molds/review-galaxy-workflow/examples/planemo-failure/`
- expect: `status: "fail"`, `planemo_result.failed == 1`,
  `failure_modality: "assertion-failure"`, and
  `next_reference_surface: "test assertion report"` — a surface from the Mold's
  closed set, not the [[planemo-asserts-idioms]] note used to read it.
  `failure_detail` names the output and the unmet assertion rather than restating
  the exit code. The job succeeded, so the modality is not a job failure.

## Case: unaddressable output is a different modality from a failed assertion

- fixture: `content/molds/review-galaxy-workflow/examples/label-test-mismatch/`
- expect: `status: "fail"` with `failure_modality: "unaddressable-output"`, not
  `assertion-failure`. The surface is `"test assertion report"` for both, so the
  modality is the whole of the distinction — the assertion never ran here, because
  the key it addresses names no output. `failure_detail` names both the test key
  (`multiqc_html_report`) and the workflow's actual promoted output
  (`MultiQC Report`), so the reader can see which side is wrong.

## Case: no test file hands off honestly instead of aborting

- fixture: `content/molds/review-galaxy-workflow/examples/missing-test/`
  (ships no `galaxy-workflow.gxwf-tests.yml`)
- expect: `status: "test-definition-missing"` with `paths_searched[]` listing
  the three candidate filenames tried, `planemo_result: null`,
  `failure_modality: null`, and `next_reference_surface: null`. The absence of a
  test is never reported as a pass, and the result artifact is still emitted so
  [[review-galaxy-workflow]] can cite it.

## Coverage gaps

No committed fixture exercises `status: "not-run"`, or a run against an existing
rather than a Planemo-managed Galaxy (`galaxy_mode: "existing"`) — every fixture
that ran records `galaxy_mode: "managed"`, and `missing-test` records none at all
because nothing ran. No case asserts either until a fixture binds them.
