---
type: research
tags:
  - target/galaxy
status: draft
created: 2026-05-03
revised: 2026-09-23
revision: 3
related_notes:
  - "[[iwc-workflow-testability-survey]]"
  - "[[iwc-test-data-conventions]]"
  - "[[planemo-asserts-idioms]]"
  - "[[iwc-shortcuts-anti-patterns]]"
  - "[[planemo-workflow-test-architecture]]"
  - "[[implement-galaxy-workflow-test]]"
  - "[[gxformat2-schema]]"
  - "[[gxformat2-workflow-inputs]]"
  - "[[galaxy-datatypes-conf]]"
summary: "Design guidance for Galaxy workflow inputs, outputs, and checkpoints that make IWC-style workflow tests possible."
---

# Design a Galaxy workflow that can be tested

Choose the workflow's public inputs and outputs while designing the analysis, before writing its `-tests.yml`. A workflow test supplies `job:` values by input name and checks `outputs:` by output name. It can only check results the workflow exposes. A good interface gives the test a reproducible input, an addressable result, and at least one assertion that would catch a meaningful wrong result.

This note concerns workflow design. [[iwc-test-data-conventions]] covers the test file's input fixtures, [[planemo-asserts-idioms]] covers assertion syntax, and [[iwc-shortcuts-anti-patterns]] explains when a smoke check is enough. [[iwc-workflow-testability-survey]] holds the broader corpus evidence.

## Name the public interface before writing tests

Give each input and promoted output a stable, descriptive public name. In an exported gxformat2 workflow this is commonly the entry's `id`. The structural [[gxformat2-schema]] also permits `label`. Check the **effective name in the workflow being tested** instead of assuming a step label, generated dataset name, or array position will become the test key. In the pinned [Scanpy workflow](https://github.com/galaxyproject/iwc/blob/main/workflows/scRNAseq/scanpy-clustering/Preprocessing-and-Clustering-of-single-cell-RNA-seq-data-with-Scanpy.ga), for example, the test's `Initial Anndata General Info` output key addresses that named workflow output, not its producing tool step.

Treat a public input or output rename as a test-interface change. Update the sibling test and any saved job mapping when it changes. Avoid leaving a useful result behind an anonymous or generated name. A workflow test may still find such an output, but the binding is harder to review and preserve.

Before committing a test, compare every `job:` and `outputs:` key with the actual workflow interface. [[validate-tests]] can check those bindings statically. A passing schema check alone does not establish that the keys exist or that the chosen assertions are meaningful.

## Expose a checkpoint that can catch the wrong result

Start with the failure the test should detect. If a final image, report, or binary artifact varies across runs, its file size or dimensions may only prove that something was produced. Look for a stable result already made along the same path: a count table, summary line, representative sequence, structured property, or other value tied to the analysis. Promote it as a workflow output when it gives the test a stronger check. Keep the final artifact as an output when users need it, and let its smoke check serve that limited purpose.

The [IWC Scanpy test](https://github.com/galaxyproject/iwc/blob/main/workflows/scRNAseq/scanpy-clustering/Preprocessing-and-Clustering-of-single-cell-RNA-seq-data-with-Scanpy-tests.yml) illustrates the combination. It checks plot dimensions and sizes, but it also checks AnnData structure, a stable summary, and a ranked-gene line exposed as separate outputs. Those checks cover different failure modes. A structural HDF5 key alone does not prove the cluster calculation is right, just as an image width does not prove the plotted values are right.

Promote selectively. A checkpoint earns a public output when it has a clear user or test purpose and an assertion can verify a property that matters. Exposing every intermediate dataset can obscure the workflow interface without improving confidence. If no stable content is available, record the limit in the test plan and use an honest smoke check rather than claiming it validates the scientific result.

## Make collection members addressable

A collection output needs predictable element identifiers at every level the test will inspect. Preserve sample or domain identifiers through mapping and collection reshaping when possible. When a tool generates identifiers, inspect an actual run and document the derivation before writing element assertions. Do not infer them from input order or a display name that may change.

The [IWC SRA manifest test](https://github.com/galaxyproject/iwc/blob/main/workflows/data-fetching/sra-manifest-to-concatenated-fastqs/sra-manifest-to-concatenated-fastqs-tests.yml) addresses samples in `paired_output`, then their `forward` and `reverse` members with nested `element_tests:`. The outer sample identifiers are unusual strings, which is fine when they are stable. Collection type and element count can check shape. Assertions on selected members must check their content or a meaningful property if a scientifically wrong member could otherwise pass. See [[planemo-asserts-idioms]] for the output-test shape and [[galaxy-collection-semantics]] for Galaxy collection types.

## Choose inputs that real fixtures can supply

An input's public name and type determine the test's `job:` entry. Check that each required input has a small, reproducible fixture or a documented way to construct one. A `list:paired` input needs the corresponding nested collection of files. A typed `int`, `boolean`, or `string` input can be set directly in the job. A reference input may need a remote file, a local test fixture, or an instance data-table value according to how the workflow actually consumes it. Choose the representation by the runtime contract and test environment, not by a blanket preference for remote files or CVMFS.

The [IWC CellPlex test](https://github.com/galaxyproject/iwc/blob/main/workflows/scRNAseq/fastq-to-matrix-10x/scrna-seq-fastq-to-matrix-10x-cellplex-tests.yml) combines nested FASTQ collections, reference files, a sample/CMO collection, and a numeric parameter. Its `job:` structure follows the workflow's declared input shapes. When translating another pipeline, resolve sample grouping, collection identifiers, datatype, and reference availability before treating a fixture as ready. [[iwc-test-data-conventions]] gives the supported YAML shapes and provenance checks.

## Express the choice in gxformat2

Top-level gxformat2 `inputs:` and `outputs:` form the workflow interface. A public `outputs:` entry points to the producing step output through `outputSource`. In converted IWC workflows, an entry such as `id: paired_output` with `outputSource: some_step/paired_output` makes the collection addressable as `paired_output` in a test. An optional `doc` can explain an otherwise terse name. The exact accepted fields are in [[gxformat2-schema]].

The step's `out:` entry has a different job. Its post-job actions can rename a dataset, change a datatype, or manage history presentation. They do not replace a stable public output name. Apply `change_datatype` only when the produced data truly has that Galaxy datatype, using [[galaxy-datatypes-conf]] to choose the extension. Do not add a post-job action merely to make a test pass. A promoted checkpoint needs a valid source connection, the right datatype, and a name the test can address.

After authoring, check the actual imported or converted workflow interface, validate the test bindings with [[validate-tests]], and run the test. Static validation will catch some structural and naming mistakes. An execution against the fixture shows whether the assertion passes. Review the failure it is meant to catch to judge whether a wrong result could also pass. [[planemo-workflow-test-architecture]] explains the runtime evidence and failure surfaces.
