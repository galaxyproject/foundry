---
type: research
tags:
  - target/galaxy
status: draft
created: 2026-04-30
revised: 2026-09-23
revision: 3
related_notes:
  - "[[galaxy-workflow-testability-design]]"
  - "[[iwc-test-data-conventions]]"
  - "[[planemo-asserts-idioms]]"
  - "[[implement-galaxy-workflow-test]]"
  - "[[tests-format]]"
  - "[[iwc-conditionals-survey]]"
  - "[[iwc-map-over-lifecycle-survey]]"
  - "[[iwc-tabular-operations-survey]]"
  - "[[iwc-transformations-survey]]"
summary: "Judgments for when weak Galaxy workflow-test assertions are useful smoke checks and when they conceal untested results."
---

# IWC test-suite shortcuts and anti-patterns

A workflow test should fail when a meaningful result is wrong. Start by naming that failure, then choose an assertion that would catch it. A size, shape, or existence check can establish that an output was produced, but it cannot establish that the analysis is correct. Keep such a **smoke check** when the result is genuinely variable or opaque, and add a stable content check or workflow checkpoint whenever one is available. Using a weak check merely because another IWC test uses it is an anti-pattern.

These authoring judgments guide [[implement-galaxy-workflow-test]]. [[planemo-asserts-idioms]] covers assertion forms, [[iwc-test-data-conventions]] covers fixtures, and [[galaxy-workflow-testability-design]] covers which intermediate results to expose as workflow outputs.

## Choose by the failure the test must catch

| Output | Useful check | Anti-pattern |
| --- | --- | --- |
| Small, byte-stable text or data | Compare with an expected `file:`. A `checksum:` can cover a large byte-stable output. | Replacing an exact comparison with size alone when exact content is stable. |
| Variable JSON or HDF5 | Assert a stable property, group, key, or count while leaving variable values unconstrained. | Checking only for `{` or file existence when a stable domain property is available. |
| Stochastic or opaque binary | Compare size with a known expected artifact, then check a stable report or summary if the workflow can expose one. | Setting a tolerance so wide that an empty or substantially wrong result passes. |
| Plot or image | Check relevant image properties and assert on the data or summary behind the plot when possible. | Treating dimensions and file size as proof of the plotted result. |
| Output with mutable headers or provenance | Assert stable records or fields, or compare an expected file with a measured difference allowance. | Assuming `lines_diff:` ignores only headers: it permits differences anywhere in the file. |

An output assertion can serve as a smoke test even when it is too weak to verify the scientific claim by itself. Record that limit in the test plan, and choose a stronger workflow-level output when the final artifact cannot expose the needed property. This is why the [Scanpy test](https://github.com/galaxyproject/iwc/blob/main/workflows/scRNAseq/scanpy-clustering/Preprocessing-and-Clustering-of-single-cell-RNA-seq-data-with-Scanpy-tests.yml) checks plot dimensions **and** separate AnnData or table outputs. Conversely, the [HyPhy core test](https://github.com/galaxyproject/iwc/blob/main/workflows/comparative_genomics/hyphy/hyphy-core-tests.yml) checks some JSON collection elements only for `{`. That establishes a limited smoke test. It is not a model for validating stable JSON properties that a new workflow could check.

## Size and difference tolerances need a reason

`compare: sim_size` compares an output against a referenced expected artifact (`file:` or `location:`). `delta:` is an absolute byte allowance, and `delta_frac:` is fractional. The [RepeatMasking test](https://github.com/galaxyproject/iwc/blob/main/workflows/repeatmasking/RepeatMasking-Workflow-tests.yml) uses broad size bands for variable outputs. Its choice shows one way to smoke-test that workflow, not a reusable tolerance for another dataset. Measure the result across representative runs and ask whether the allowed range still rejects the failure you named. If the lower bound reaches zero, a size comparison alone cannot catch an empty output.

For `compare: diff`, `lines_diff:` allows a **count** of differing lines. A changed line counts as two, one removal and one addition, under the [[tests-format|vendored test-format schema]]. The allowance does not identify which lines may differ. Copying `lines_diff: 6` from a VCF example because six header lines seem mutable could also permit changed variant records. Inspect the actual diff and add a targeted content assertion if those records matter.

## Keep format and contribution rules separate

Planemo [supports exact files, output checksums, and tolerant assertions](https://planemo.readthedocs.io/en/stable/test_format.html#outputs). A checksum is a good fit for a large result known to be byte-stable. Input `hashes:` verify fixture integrity. Choose an output assertion from the result's stability and the failure the test should detect.

Do not ban a failure-path test, a hand-written test, or a non-Zenodo fixture on the basis of corpus habit. Planemo's [[tests-format|test format]] includes `expect_failure:`, and the [IWC contribution guide](https://github.com/galaxyproject/iwc/blob/main/workflows/README.md#generate-tests) permits tests written by hand as well as tests generated from an invocation. A negative case is useful when the workflow itself promises to reject an invalid input. A tool-specific validation failure usually belongs in that tool's tests. Choose a small, reproducible fixture and verify a remote file's digest when one is recorded. [[iwc-test-data-conventions]] gives the input shapes and provenance details.

Workflow tests address outputs by label and collection members by identifier. A label or identifier mismatch is a broken test, not an assertion-strength tradeoff. Check those names against the workflow before running Planemo, then run the test against a real invocation. A green smoke check says only that the property it asserted held.
