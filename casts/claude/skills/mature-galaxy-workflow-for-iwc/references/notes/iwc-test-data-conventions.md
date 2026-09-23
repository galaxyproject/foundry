---
type: research
tags:
  - target/galaxy
status: draft
created: 2026-04-30
revised: 2026-09-23
revision: 4
related_notes:
  - "[[galaxy-workflow-testability-design]]"
  - "[[iwc-shortcuts-anti-patterns]]"
  - "[[planemo-asserts-idioms]]"
  - "[[implement-galaxy-workflow-test]]"
  - "[[tests-format]]"
  - "[[iwc-tabular-operations-survey]]"
summary: "IWC and Planemo workflow-test fixture shapes, file provenance, collection identifiers, input hashes, and built-in index values."
---

# IWC test data conventions

An IWC workflow test pairs each workflow with a sibling `<workflow>-tests.yml`. Each YAML test case supplies `job:` inputs under the workflow's input labels and `outputs:` assertions under its output labels. The optional `test-data/` directory holds local fixtures. These are the [IWC contribution layout](https://github.com/galaxyproject/iwc/blob/main/workflows/README.md) and [Planemo test-format](https://planemo.readthedocs.io/en/latest/test_format.html) contracts. For decisions about the workflow interface before writing fixtures, see [[galaxy-workflow-testability-design]]. For the exact supported YAML vocabulary and static validation, see [[tests-format]].

Examples below come from the cited IWC files or Planemo documentation. Corpus observations describe the workflows sampled for this note, not a rule that every IWC workflow follows.

## Fixture locations and provenance

A `class: File` input can use `path:` for a local fixture or `location:` for a URI. Planemo resolves a relative `path:` from the workflow and test directory. IWC's contribution guide recommends small inputs and suggests publishing a toy dataset to Zenodo for a permanent URL. The repository also permits an optional local `test-data/` directory. It gives no universal size cutoff or mandatory host. [Planemo input format](https://planemo.readthedocs.io/en/latest/test_format.html#job), [IWC contribution guide](https://github.com/galaxyproject/iwc/blob/main/workflows/README.md#find-input-datasets).

| Source | Useful when | Example |
| --- | --- | --- |
| Local `path:` | A small fixture belongs beside the test and can be reviewed in the repository | `path: test-data/input_accession_single_end.txt` in the [IWC guide](https://github.com/galaxyproject/iwc/blob/main/workflows/README.md#manually-write-test-for-workflow) |
| Remote `location:` | A published dataset or accession is the source of the test input | Zenodo paired reads in the [short-read QC test](https://github.com/galaxyproject/iwc/blob/main/workflows/read-preprocessing/short-read-qc-trimming/short-read-quality-control-and-trimming-tests.yml) |
| Local expected `file:` | An output is small and deterministic enough for comparison | `file: test-data/SRR044777_head.fastq` in the [IWC guide](https://github.com/galaxyproject/iwc/blob/main/workflows/README.md#manually-write-test-for-workflow) |

Large or variable outputs are better checked with targeted assertions than committed as full expected files, as the [IWC guide](https://github.com/galaxyproject/iwc/blob/main/workflows/README.md#generate-test-from-a-workflow-invocation) recommends. [[planemo-asserts-idioms]] covers assertion choice. A test may mix local paths, remote locations, and scalar parameters in one `job:`.

```yaml
- doc: Test with a published input
  job:
    Reference FASTA:
      class: File
      location: https://www.ebi.ac.uk/ena/browser/api/fasta/AF325528.1?download=true
      filetype: fasta
      hashes:
        - hash_function: SHA-1
          hash_value: 927d0d00b7db6ad60524bb9e50d3ab41c4ac5ecf
  outputs:
    result:
      asserts:
        has_text:
          text: expected-marker
```

The `Reference FASTA` file block is from the sampled IWC `virology/pox-virus-amplicon/pox-virus-half-genome-tests.yml`. The surrounding test case and output are illustrative. `filetype:` names a Galaxy datatype. The `hashes:` list records input integrity, including the algorithm and digest. SHA-1 is common in the sampled IWC inputs, but the [[tests-format|vendored test-format schema]] also permits MD5, SHA-256, and SHA-512. Record a digest only after computing or verifying it against the actual file. Local paths may also carry hashes. Do not infer a hash merely from a URL or assume invocation generation was its source.

Input `hashes:` and output `checksum:` serve different purposes. Planemo [documents output checksums](https://planemo.readthedocs.io/en/latest/test_format.html#outputs), as well as `file:` comparisons and content assertions. The sampled IWC tests favored the latter forms, but that observation does not remove `checksum:` from the format.

## Collection inputs

An explicit collection names its shape with `collection_type:` and gives each element an `identifier:`. Match the workflow's declared input type and use identifiers that the workflow and output assertions can address. The [Planemo collection examples](https://planemo.readthedocs.io/en/latest/test_format.html#galaxy-collection-inputs) show both a `list` and a nested `list:paired`.

```yaml
job:
  samples:
    class: Collection
    collection_type: list
    elements:
      - identifier: sample_a
        class: File
        path: test-data/sample_a.fastq.gz
        filetype: fastqsanger.gz
      - identifier: sample_b
        class: File
        path: test-data/sample_b.fastq.gz
        filetype: fastqsanger.gz
```

The [IWC short-read QC test](https://github.com/galaxyproject/iwc/blob/main/workflows/read-preprocessing/short-read-qc-trimming/short-read-quality-control-and-trimming-tests.yml) uses the nested form. The outer collection is `list:paired`, each outer element has `type: paired`, and the two files are identified as `forward` and `reverse`:

```yaml
job:
  Raw reads:
    class: Collection
    collection_type: list:paired
    elements:
      - class: Collection
        type: paired
        identifier: pair
        elements:
          - class: File
            identifier: forward
            location: https://zenodo.org/records/11484215/files/paired_r1.fastq.gz
            filetype: fastqsanger.gz
          - class: File
            identifier: reverse
            location: https://zenodo.org/records/11484215/files/paired_r2.fastq.gz
            filetype: fastqsanger.gz
```

A bare `paired` collection uses the inner shape without the outer list. For deeper collections, keep each level's type and identifiers aligned with the workflow input. Check the resulting YAML against [[tests-format]] and the concrete workflow. The sampled IWC tests also contain nested output assertions: an output collection's `element_tests:` selects an outer identifier, then `elements:` selects nested identifiers. See the sampled `scRNAseq/fastq-to-matrix-10x/scrna-seq-fastq-to-matrix-10x-cellplex-tests.yml` and [[planemo-asserts-idioms]].

Planemo also [accepts a plain YAML list of File objects](https://planemo.readthedocs.io/en/latest/test_format.html#galaxy-collection-inputs) as a simple Galaxy `list`. That shorthand gives no control over element identifiers. Use the explicit collection form when names or a non-list shape matter. Do not treat an absence from a sample of IWC tests as a parser restriction.

A collection element's `identifier:` is distinct from the workflow input label used as the `job:` key. Preserve meaningful, stable identifiers when downstream outputs or tests refer to them. Quote YAML mapping keys where required by YAML syntax. In a `paired` collection, the member identifiers are `forward` and `reverse`. An outer `list:paired` element can have a sample identifier such as `pair`. The [Planemo nested example](https://planemo.readthedocs.io/en/latest/test_format.html#galaxy-collection-inputs) shows this distinction.

## Other documented input forms

The [Planemo composite-input example](https://planemo.readthedocs.io/en/latest/test_format.html#galaxy-composite-inputs) specifies `composite_data:` as a **list** of local `path:` objects, for example an imzML file plus its `.ibd` companion. The documentation says URI components are not tested there. The sampled IWC tests did not provide a composite example, so validate an actual composite case before relying on it.

```yaml
job:
  imaging input:
    class: File
    filetype: imzml
    composite_data:
      - path: test-data/Example_Continuous.imzML
      - path: test-data/Example_Continuous.ibd
```

Planemo also [documents `tags:` on collection elements](https://planemo.readthedocs.io/en/latest/test_format.html#galaxy-tags). File attributes such as `dbkey:` and `decompress:` appear in the [[tests-format|vendored test-format schema]]. These are available vocabulary, not requirements for every fixture. Use them when the workflow or data import needs them, then validate the concrete test.

## Data-table values and built-in indexes

A workflow input selecting an installed reference index takes a scalar value from the relevant Galaxy data table. For example, the [IWC contribution guide's Bowtie2 example](https://github.com/galaxyproject/iwc/blob/main/workflows/README.md#use-build-in-indexes) maps the displayed hg38 index to the plain value `hg38` from `bowtie2_indices.loc`:

```yaml
job:
  reference genome: hg38
```

The value column depends on the tool and table definition. Check that tool's `tool_data_table_conf.xml` and the target instance's available table entries. This input is a parameter, not a `class: File` fixture. IWC says its default CI Galaxy has CVMFS for built-in indexes. A local or other Galaxy instance must expose the same table value and underlying reference data for this test to run. A portable file input is possible only if the workflow interface and tool accept a file in place of the built-in index. Do not replace the scalar with `class: File` solely in the test YAML.

## Authoring and checking an IWC test

IWC [permits hand-written cases](https://github.com/galaxyproject/iwc/blob/main/workflows/README.md#generate-tests) and documents `planemo workflow_test_init <workflow.ga>` for a blank template. A successful Galaxy invocation can seed a more complete test with `planemo workflow_test_init --from_invocation ...`. Inspect generated paths, labels, hashes, and output comparisons before retaining them. IWC recommends assertions in place of large or unstable exact-output files. It also documents `planemo workflow_lint`, `planemo test`, and `planemo workflow_test_on_invocation` for checking a test against a saved invocation. [IWC testing instructions](https://github.com/galaxyproject/iwc/blob/main/workflows/README.md#manually-write-test-for-workflow), [Planemo workflow best practices](https://planemo.readthedocs.io/en/stable/best_practices_workflows.html#tests).

IWC's preferred PR test runs on a Galaxy instance started by the GitHub Actions worker. Its [contribution guide](https://github.com/galaxyproject/iwc/blob/main/workflows/README.md#request-testing-against-an-external-galaxy-instance) describes an external instance via `.wt_instance` as a last resort when required infrastructure or reference data cannot reasonably be made available in CI. That is a workflow-specific exception, not an implication of every CVMFS-backed test. Before running a test elsewhere, verify that the instance has the required tools, datatypes, data tables, and reference data.

## Related references

- [[galaxy-workflow-testability-design]] — choose stable workflow labels, collection types, and output checkpoints.
- [[planemo-asserts-idioms]] — choose output checks and tolerances.
- [[implement-galaxy-workflow-test]] — turn a test plan and resolved data references into a test file.
- [[tests-format]] — exact Foundry schema and validator for the YAML format.
- [IWC workflow contribution guide](https://github.com/galaxyproject/iwc/blob/main/workflows/README.md) and [Planemo test format](https://planemo.readthedocs.io/en/latest/test_format.html) — upstream contracts.
