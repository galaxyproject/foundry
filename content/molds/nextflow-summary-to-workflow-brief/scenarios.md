# Nextflow-to-brief scenarios

## Case: source processes do not force Galaxy design or whole-pipeline scope

- fixture: `casts/claude/skills/summarize-nextflow/runs/nf-core__demo/summary.json`
- expect: Given the expert's selected read-quality-only scope, preserve the source pin and evidence for that selection. Exclude SEQTK_TRIM and MULTIQC rather than porting every process. Source tuples and containers do not become assumed Galaxy collections or available wrappers. The expected brief is in `content/molds/nextflow-summary-to-workflow-brief/examples/workflow-brief.md`.
