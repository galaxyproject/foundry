# Unlabelled step removal

A test-phase run took `subsample_reads` out of the workflow and recorded only a plain gap for it. The gap cites Galaxy's `validation_failed` scheduler log line, which is not a failure verdict. Planemo passes on the reduced workflow.

- `galaxy-workflow.extracted.gxwf.yml`: the workflow as the per-step loop extracted it.
- `galaxy-workflow.gxwf.yml` and `galaxy-workflow.gxwf-tests.yml`: the workflow and test after the test phase.
- `open-requirements.ledger.yml`: the ledger, with no `kind: dropped` entry for `subsample_reads`.
- `open-requirements.dropped.ledger.yml`: the same ledger with the gap recorded as a `kind: dropped` entry instead, still citing only the log line.
- `step-diff.json`: `gxwf diff --json galaxy-workflow.extracted.gxwf.yml galaxy-workflow.gxwf.yml`, from galaxy-tool-util-ts PR #233 at `a5c6cd57`.
- `workflow-test-result.json`: the result `run-workflow-test` emits.
