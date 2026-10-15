---
type: research
tags:
  - target/galaxy
status: draft
created: 2026-04-30
revised: 2026-09-23
revision: 7
related_notes:
  - "[[galaxy-workflow-testability-design]]"
  - "[[iwc-test-data-conventions]]"
  - "[[iwc-shortcuts-anti-patterns]]"
  - "[[implement-galaxy-workflow-test]]"
  - "[[tests-format]]"
  - "[[planemo-workflow-test-architecture]]"
  - "[[validate-tests]]"
  - "[[iwc-tabular-operations-survey]]"
  - "[[galaxy-discover-datasets]]"
summary: "Choose Galaxy workflow-test output assertions by the failure they should catch, the output's stability, and the available checkpoints."
---

# Choosing Planemo workflow-test assertions

Name the wrong result a test must catch before choosing YAML syntax. For a fixed input and byte-stable output, compare the result with an expected file or checksum. For a variable result, assert the stable properties that would fail if the analysis were wrong. A size, shape, or existence check is a useful smoke test when content is genuinely variable, ideally alongside a stable checkpoint. It is an anti-pattern when it replaces a more meaningful check that is available. [[iwc-shortcuts-anti-patterns]] develops that judgment, while [[iwc-test-data-conventions]] covers input fixtures and [[tests-format]] supplies the exact assertion vocabulary.

## 1. Choose by the property, then the output type

| Output | Meaningful check to try | If the result varies |
| --- | --- | --- |
| Text report or HTML | [[tests-format#has_text_model|has_text]] for a stable result, section, or value. Use [[tests-format#has_line_model|has_line]] for a complete stable line. | Use [[tests-format#has_text_matching_model|has_text_matching]] or [[tests-format#has_line_matching_model|has_line_matching]] for a bounded variable field. Line count or size can supplement the content check. |
| TSV, CSV, BED, GFF, or GTF | Compare a small deterministic file, or check a stable header and representative data row. [[tests-format#has_n_columns_model|has_n_columns]] checks shape. | Check a stable row or field, with a justified [[tests-format#has_n_lines_model|has_n_lines]] range if row count varies. Do not infer correct rows from column count alone. |
| VCF | Compare expected calls exactly when reproducible. Otherwise assert a known variant record or a bounded record pattern. | Header changes may justify a measured `lines_diff:`, but the allowance applies to the whole file. Pair it with a record-level check. |
| FASTA or FASTQ | Compare exact sequence output when reproducible, or assert a known sequence or read identifier. | Line or size checks only establish rough shape. Check a stable sequence statistic or expose one as another output when content varies. |
| JSON | [[tests-format#has_json_property_with_value_model|has_json_property_with_value]] for a stable JSON value, or [[tests-format#has_json_property_with_text_model|has_json_property_with_text]] for a stable string. | Choose a stable property or companion summary. Searching for `{` proves little beyond text presence. |
| HDF5 or AnnData | [[tests-format#has_h5_keys_model|has_h5_keys]] for required groups or datasets, and [[tests-format#has_h5_attribute_model|has_h5_attribute]] where an attribute value matters. | Keys prove structure, not cell counts or biological results. Assert a stable table or report checkpoint too. |
| XML | [[tests-format#is_valid_xml_model|is_valid_xml]] plus [[tests-format#has_element_with_path_model|has_element_with_path]], element text, or element count for the property at issue. | Ignore irrelevant formatting while keeping a stable semantic assertion. |
| Images and plots | Image dimensions or channel/frame checks confirm rendering and shape. | Check the table, matrix, or summary behind the plot if available. Size and dimensions alone do not verify plotted values. |
| ZIP, tar, or tar.gz archives | [[tests-format#has_archive_member_model|has_archive_member]] for required members, optionally with nested assertions on member content. | Compare stable members or a companion report when the archive bytes vary. This assertion is for archive formats, not BAM or HDF5. |
| BAM or other opaque binary | Exact file or checksum comparison if byte-stable. | A measured size band can be a smoke check. Expose a flagstat, coverage table, or other stable summary to check the analysis. |
| Output collection | Assert collection type or count and address significant members by identifier with `element_tests:`. | Member existence alone cannot verify member content. Give representative members meaningful assertions. |

If only a weak final artifact is exposed, consider adding a workflow output that carries a stable result before settling on the smoke check. The [IWC Scanpy workflow test](https://github.com/galaxyproject/iwc/blob/main/workflows/scRNAseq/scanpy-clustering/Preprocessing-and-Clustering-of-single-cell-RNA-seq-data-with-Scanpy-tests.yml) checks image properties and also asserts on AnnData and text or table outputs. [[galaxy-workflow-testability-design]] explains how to choose those checkpoints. An assertion on a checkpoint should test the relevant result, not merely that its file exists.

## 2. Compare operators and expected artifacts

`file:` or `location:` supplies an expected artifact for a comparison. `compare: diff` is the default and is appropriate for byte-stable results. An output `checksum:` can cover a large byte-stable result without storing the whole expected file. Use `compare: re_match` or `re_match_multiline` when the expected artifact expresses bounded regex variation, `contains` when an expected block must occur in the output, and `sim_size` when only approximate byte size is dependable. [Planemo's output-format guide](https://planemo.readthedocs.io/en/latest/test_format.html#outputs) documents these forms. Exact comparison gives a useful diff on failure, so keep it when the output really is stable.

`lines_diff:` on `diff` is a count of allowed differing lines, not an instruction to ignore a header. A changed line counts as a removal and an addition under the [[tests-format|vendored schema]]. For a VCF with mutable provenance, inspect actual comparisons to set any allowance, then ensure the allowed count cannot let a changed call pass unnoticed. A fixed `lines_diff: 6` is not a VCF default. If a record is stable, assert that record separately or compare a normalized output.

## 3. Set tolerances from the failure boundary

For `compare: sim_size`, `delta:` is an absolute byte allowance and `delta_frac:` a fractional allowance relative to the expected artifact. For [[tests-format#has_size_model|has_size]], `delta:` is an absolute byte allowance around `size:`. In count and image assertions, `delta:` uses that assertion's unit, such as lines or pixels. Do not transfer a number between assertion families without checking its unit in [[tests-format]].

Run representative inputs across the environments the test must support. Record the observed range and choose the smallest allowance that includes expected variation while rejecting the wrong result named at the start. In particular, check whether the lower bound admits an empty output. If it does, add a positive minimum or a stronger assertion. The [IWC RepeatMasking test](https://github.com/galaxyproject/iwc/blob/main/workflows/repeatmasking/RepeatMasking-Workflow-tests.yml) uses broad size comparisons for variable outputs, but its byte allowances are measurements for that case, not reusable defaults. There is no general 10% tolerance for new outputs.

## 4. Text assertions and repeated checks

Use `has_text` for a literal substring, `has_line` for a complete line, and their `*_matching` forms when a regex is needed. `has_n_lines` checks count and can detect truncation, but a plausible count does not establish correct content. A test can combine count with a stable token or row. The [[tests-format|schema]] accepts `asserts:` as a mapping for one assertion of each kind or as a list. Use the list form to repeat a kind: repeated YAML mapping keys can silently overwrite earlier checks.

```yaml
- doc: Stable report fields
  job:
    input:
      class: File
      path: test-data/input.txt
  outputs:
    report:
      asserts:
        - has_text:
            text: "Total Sequences"
        - has_text:
            text: "Passed"
        - has_n_lines:
            n: 12
```

The names and count above are illustrative. Replace them with values observed from the fixture being tested. A `has_text` assertion with `text: "ERROR"` and `negate: true` is useful when absence of that marker is part of the output contract. A workflow-level `expect_failure:` case is useful when the workflow itself promises to reject an invalid input. Neither is an automatic requirement for every workflow.

## 5. Collection and structured-output examples

For a collection output, `element_tests:` maps produced element identifiers to assertions. Use it at each level of a nested output collection too, as the [IWC SRA manifest test](https://github.com/galaxyproject/iwc/blob/main/workflows/data-fetching/sra-manifest-to-concatenated-fastqs/sra-manifest-to-concatenated-fastqs-tests.yml#L12-L27) does for samples and their forward/reverse files. Galaxy also accepts `elements:` as an alias at either level, but a different key is not required for nesting. This differs from a `job:` collection input, where `elements:` lists the input fixtures. The output collection's `attributes:` or `element_count:` can check shape, while element assertions check results. See [[tests-format]] and [Galaxy's collection-test parser](https://github.com/galaxyproject/galaxy/blob/a63da1dfd1960360f4aa2fddc6a75396954d750a/lib/galaxy/tool_util/parser/interface.py#L860-L870).

```yaml
- doc: Check selected collection members
  job:
    input:
      class: File
      path: test-data/input.txt
  outputs:
    results:
      class: Collection
      collection_type: list
      element_tests:
        sample_a:
          asserts:
            has_json_property_with_text:
              property: status
              text: complete
        sample_b:
          asserts:
            has_json_property_with_value:
              property: count
              value: "3"
```

For `has_json_property_with_value`, `value:` is a **JSON-encoded string**, so a numeric three is written `"3"` in YAML. For HDF5, `has_h5_keys` takes one comma-separated `keys:` string, for example `keys: "obs/louvain,var/highly_variable"`. Use an additional result assertion if these structural keys could survive a scientifically wrong computation. Check the syntax against the vendored schema rather than copying YAML with repeated keys from an existing test.

## 6. Validate labels and schema before execution

A schema-valid test can still name an output or input label that the workflow does not expose. Run [[validate-tests]] with the workflow to check both the test format and the label/type match before a Galaxy run:

```sh
gxwf validate-tests workflow-tests.yml --workflow workflow.ga
```

That static check cannot prove an assertion passes or that a chosen property is scientifically meaningful. Follow it with `planemo workflow_test_on_invocation` against a saved successful invocation when available, then run the full [[planemo-test|Planemo test]] for integration. If an assertion fails, inspect the actual output and the named failure before widening a tolerance. See [[planemo-workflow-test-architecture]] for execution and failure evidence.

## 7. Create and refine the test

The [IWC contribution guide](https://github.com/galaxyproject/iwc/blob/main/workflows/README.md#generate-tests) permits writing a test by hand or generating a starting file. `planemo workflow_test_init` can create a template, and `--from_invocation` can use an existing successful invocation. Inspect generated input references, labels, expected files, and comparisons. Keep exact comparisons that are stable. Replace those made brittle by known variation with targeted assertions that still catch wrong results. [[planemo-workflow_test_on_invocation]] can rerun assertion checks against that invocation without executing the workflow again.

## 8. Source of the exact syntax

[[tests-format]] points to the vendored JSON Schema for accepted fields, types, defaults, and assertion arguments. This note supplies the choice and its limits, not a second schema. Consult the [Planemo test-format documentation](https://planemo.readthedocs.io/en/latest/test_format.html) for the upstream test-file structure and [[iwc-shortcuts-anti-patterns]] for when a smoke check conceals an available stronger test.
