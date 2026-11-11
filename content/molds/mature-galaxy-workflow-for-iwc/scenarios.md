# mature-galaxy-workflow-for-iwc scenarios

## Case: workflow-only input

- fixture: examples/workflow-only/starting-galaxy-workflow.gxwf.yml
- expect: the Mold proceeds without a summary or companion test, derives its inventory from the workflow, emits no invented test, and reports absent contributor metadata as focused unresolved decisions.

## Case: label cleanup stays synchronized

- fixture: examples/label-cleanup/
- expect: `raw_reads` and `multiqc_html_report` become human-readable in the workflow and supplied test together, while the existing output assertion remains unchanged.

## Case: safe sample-path generalization

- fixture: examples/safe-generalization/
- expect: the literal sample path is replaced by a workflow input and the supplied test provides the same path; tool identity, other state, and output assertions do not change.

## Case: ambiguous reference strategy

- fixture: examples/ambiguous-reference/starting-galaxy-workflow.gxwf.yml
- expect: the built-in reference setting remains unchanged, the report records `needs-user-input`, and the ledger says which intended portability or reference-data decision would resolve it.

## Case: already mature workflow

- fixture: examples/already-mature/
- expect: the workflow and test receive no gratuitous churn, passing checklist items cite their evidence, and companion documents are preserved except for changes required to make them mutually consistent.

## Case: supplied README carries development history

- fixture: examples/readme-history/
- expect: the emitted README keeps the purpose, the inputs, and the short reason for using Clair3 rather than medaka, which the workflow `doc` also states. The usegalaxy.org pass claim, invocations `4ae2da923366f120` and `fbf1b200b6a8b01c`, the `History` block, the arm64 NanoPlot failure, the failed medaka 1.4.4 run, and the `gxwf validate` reviewer note leave the README and appear in `iwc-maturation-report.md`.
