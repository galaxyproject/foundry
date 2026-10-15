# Nextflow journey input: read quality reporting

Source repository: https://github.com/nf-core/demo.git
Source pin: 45904cb9d12db3d89900e6c479fe604ef71b297b

The expert selects read quality reporting attributable to each sample. Exclude
trimming and aggregate reporting. This selection is expert intent; the source
process list does not force a whole-pipeline port.

For phase 1, use a source checkout at that pin. The committed extraction at
`casts/claude/skills/summarize-nextflow/runs/nf-core__demo/summary.json` is
comparison evidence for this scenario, not a source tree to pass to the
summarizer. It records FASTQC, MULTIQC, and SEQTK_TRIM source processes.

The expected brief is
`content/molds/nextflow-summary-to-workflow-brief/examples/workflow-brief.md`.
Current agent environment evidence must be supplied or collected; do not
infer availability of any Galaxy wrappers from this source extraction.
