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
summary: "How to judge weak IWC workflow-test assertions against the behavior they need to protect, with corpus examples and Planemo limits."
---

# IWC test-suite shortcuts and anti-patterns

A small or variable Galaxy workflow output may need a tolerant assertion. A weak check is useful when it tests the failure the workflow is most likely to have, but it should not stand in for a stable content check that the same run can supply. Choose assertions from the output's behavior and the workflow's claim, then run the test. The presence or absence of a YAML key in IWC examples does not by itself define what Planemo accepts.

This note makes the shortcut-versus-smell decision for [[implement-galaxy-workflow-test]]. [[planemo-asserts-idioms]] covers assertion syntax, [[iwc-test-data-conventions]] covers fixtures, and [[galaxy-workflow-testability-design]] covers workflow labels and testable output design. The examples and counts below refer to the Foundry's pinned survey of **115** IWC `*-tests.yml` files under `workflow-fixtures/iwc-src/workflows/`. They describe that snapshot, not all current IWC tests or a reviewer policy. Links to upstream examples allow the reader to inspect the workflows themselves.

## Choose the narrowest useful check

| Output and risk | Defensible first check | Revisit it when |
| --- | --- | --- |
| Variable JSON or HDF5 | Stable key or structure assertion | A stable domain value or count is available |
| Variable binary file | Size range against a known expected artifact | A text, metadata, or table checkpoint can test the scientific result |
| Rendered image | Dimensions and size range | A stable data table or image property can test the plotted result |
| Small deterministic text | Expected file, line, or stable content | Exact bytes vary for a known reason |

Planemo supports exact expected files, output `checksum:`, content assertions, and tolerant comparisons. Its [test-format guide](https://planemo.readthedocs.io/en/stable/test_format.html#outputs) recommends an expected file for small fixed outputs and a checksum when fixed outputs are large. A corpus preference for looser checks does not prohibit either. Write the expected result from a real run, then choose a tolerance that covers measured variation without also accepting the failure you care about.

### Structural and existence probes

The [HyPhy core test](https://github.com/galaxyproject/iwc/blob/main/workflows/comparative_genomics/hyphy/hyphy-core-tests.yml) targets named elements of four output collections and checks their JSON with `has_text` for `{`. The pinned survey also found `has_h5_keys` checks for AnnData in the [Scanpy test](https://github.com/galaxyproject/iwc/blob/main/workflows/scRNAseq/scanpy-clustering/Preprocessing-and-Clustering-of-single-cell-RNA-seq-data-with-Scanpy-tests.yml). These checks can catch a missing output, wrong collection element, or missing HDF5 group. A `{` substring alone does **not** establish valid JSON or correct statistics, and an HDF5 key does not establish correct values.

Use a structural probe when numeric results move between runs and no stable result can be asserted. If the output is deterministic, prefer a known row, field, count, or expected file. For a variable final report, consider exposing a stable intermediate table and asserting on it as well. The pinned survey counted many `has_text` uses with substantive expected text, so do not describe every `has_text` as an existence-only check.

### Size comparisons

The pinned 115-file survey found `compare: sim_size` in **9** files, including the [RepeatMasking test](https://github.com/galaxyproject/iwc/blob/main/workflows/repeatmasking/RepeatMasking-Workflow-tests.yml). A size band can detect an empty or grossly truncated output when stochastic content makes exact comparison unreliable. Its `delta:` is an **absolute byte tolerance** around the size of a referenced expected artifact (`file:` or `location:`). Planemo's [example](https://planemo.readthedocs.io/en/stable/test_format.html#outputs) uses `file:`, while the sampled RepeatMasking test uses `location:`. Some sampled tests use `delta_frac:` for a fractional tolerance. Do not copy a delta from another workflow: compare repeated runs and check that the permitted interval excludes the failure of interest.

A size-only assertion is a smell when a stable semantic property is available, especially for a deterministic table. It cannot tell whether rows, labels, or biological interpretation are right. Pair it with a header, row, count, or other stable checkpoint when possible. The [IWC contribution guide](https://github.com/galaxyproject/iwc/blob/main/workflows/README.md#generate-test-from-a-workflow-invocation) recommends assertions in place of storing large expected outputs, but it does not prescribe size-only checks.

### Image probes

The [Scanpy test](https://github.com/galaxyproject/iwc/blob/main/workflows/scRNAseq/scanpy-clustering/Preprocessing-and-Clustering-of-single-cell-RNA-seq-data-with-Scanpy-tests.yml) checks plot size, width, and height with tolerances. This tests that a plot was emitted in the expected shape. It cannot detect swapped colors, wrong cluster assignments, or an incorrect axis label. Scanpy's sibling assertions on AnnData keys and cell-count outputs provide different evidence about the analysis. The pinned [tissue microarray tests](https://github.com/galaxyproject/iwc/tree/main/workflows/imaging/tissue-microarray-analysis) also use `has_image_channels`, so channel checks are an observed option rather than a proposed addition.

Choose image tolerances from rendered samples on the intended test environment. Zero tolerance is appropriate when the particular renderer and property are stable. If the scientific result matters, test an underlying table or another content property in addition to plot dimensions. See [[planemo-asserts-idioms]] for image assertion forms.

### Exact files, checksums, and tolerated diffs

The pinned survey found `compare: diff` in **5** test files and no output `checksum:` or `md5:` keys. That is an observation, not a prohibition. Planemo [documents output checksums](https://planemo.readthedocs.io/en/stable/test_format.html#outputs) for fixed large results. Input `hashes:` in `job:` instead checks the integrity of an imported fixture, as [[iwc-test-data-conventions]] explains. Do not substitute one for the other.

An exact file or checksum is strongest when the output is byte-stable across the intended runtime. If timestamps, provenance, random seeds, tool versions, or serialization order alter bytes, assert a stable property instead. `compare: diff` with `lines_diff:` allows a count of differing lines in an expected-file comparison. A changed line counts as two, one removal and one addition, under the [[tests-format|vendored test-format schema]]. The sampled variant-calling tests use `lines_diff: 6`, but that number alone does not identify which lines may differ or prove that only headers changed. Inspect a real diff before setting it. A tolerance large enough to absorb a wrong variant row is a smell.

### Labels and visible checkpoints

Planemo [requires explicit workflow output labels](https://planemo.readthedocs.io/en/stable/test_format.html#outputs) for the keys in a test's `outputs:` mapping. The Foundry's [[iwc-workflow-testability-survey]] matched all asserted labels in its 114 workflow/test pairs to top-level workflow outputs. Renaming one of those labels requires updating the sibling test. Spaces and punctuation are acceptable when the key matches the workflow label exactly.

An intermediate result cannot be asserted by the workflow test unless the workflow exposes it as an output. The [Scanpy workflow and test](https://github.com/galaxyproject/iwc/tree/main/workflows/scRNAseq/scanpy-clustering) expose and check intermediate summaries, plots, and final results. Promote a checkpoint when it gives meaningful evidence unavailable from the final artifact. Exposing every intermediate only for a trivial existence check adds noise without much test value. [[galaxy-workflow-testability-design]] develops the design choice.

## What the pinned corpus does not establish

The survey found **no** `expect_failure:` in its 115 workflow test files. That describes the sample's successful-run focus. It does not prove that all negative workflow tests are forbidden, or that a source pipeline's failure-path test should be dropped. If failure behavior matters, check the current [[tests-format]] contract and test the behavior at the appropriate tool or workflow level.

The survey also observed frequent remote `location:` inputs, many with SHA-1 `hashes:`, and local `test-data/` fixtures. The [IWC guide](https://github.com/galaxyproject/iwc/blob/main/workflows/README.md#find-input-datasets) recommends small inputs and suggests Zenodo for a permanent URL. It does not set a one-megabyte cutoff, require Zenodo for every remote input, or require every test to be generated from an invocation. It explicitly allows hand-written tests and describes both authoring routes. Choose the smallest representative fixture, verify its source and digest when one is recorded, and confirm the test can fetch it on the target runner.

The [IWC contribution guide](https://github.com/galaxyproject/iwc/blob/main/workflows/README.md#ensure-workflows-follow-best-practices) separately asks for a fully qualified creator URI and describes `release` and `CHANGELOG.md` metadata. Those are workflow submission requirements, not evidence that a particular assertion is strong or weak. Keep that review separate from the test's claim about outputs.

## Before keeping a shortcut

1. Name the regression the assertion should catch and an incorrect output it might still accept.
2. Inspect an actual result and, for a tolerance, more than one run or a documented source of variation.
3. Prefer a stable content or checkpoint assertion where one exists. Keep a size or image probe for what it genuinely tests.
4. Match input and output labels to the workflow. Verify collection identifiers where `element_tests:` selects members.
5. Run the test and review a failing comparison if possible. A green test alone does not show that its assertion would catch the intended regression.

For the YAML forms, use [[planemo-asserts-idioms]] and [[tests-format]]. For fixture provenance, hashes, and collection inputs, use [[iwc-test-data-conventions]].
