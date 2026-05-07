# Galaxy Interface Brief

## Source

- Source summary: `casts/claude/skills/summarize-nextflow/runs/nf-core__demo/summary.json`.
- Pipeline: `nf-core/demo` at `45904cb9d12db3d89900e6c479fe604ef71b297b`.
- Primary workflow: `DEMO`.

## Workflow Inputs

| Label | Source evidence | Galaxy shape | Required | Confidence | Notes |
|---|---|---|---|---|---|
| `input_samples` | `sample_sheets[0]` for `params.input`; columns `sample`, `fastq_1`, optional `fastq_2` | `collection`, `sample_sheet:paired_or_unpaired` | yes | high | Keeps sample metadata and supports optional mate file. |
| `skip_trim` | `params.skip_trim`; guard `!params.skip_trim` affects `SEQTK_TRIM` | `boolean` | no, default `false` | high | Preserves source branch that skips trimming. |
| `multiqc_config` | optional path-like report config param consumed by `MULTIQC` | `data`, likely `yaml` | no | medium | Keep only if target wants custom report config. |
| `multiqc_logo` | optional path-like report logo param consumed by `MULTIQC` | `data`, datatype uncertain | no | low | Could be excluded in a minimal Galaxy translation. |

Excluded params: `outdir`, `publish_dir_mode`, email/webhook params, help/version/logging params, profile/config params, and test-data base path are Nextflow runtime or publishing concerns; Galaxy owns history outputs and workflow execution UX.

## Workflow Outputs

| Label | Source evidence | Galaxy type | Confidence | Notes |
|---|---|---|---|---|
| `fastqc_html` | `FASTQC.out.html` | collection of HTML reports | high | Useful checkpoint output. |
| `fastqc_zip` | `FASTQC.out.zip`, also feeds MultiQC | collection of ZIP reports | high | Useful checkpoint and MultiQC input. |
| `trimmed_reads` | `SEQTK_TRIM.out.reads`; conditional on `skip_trim=false` | collection of FASTQ datasets | medium | Branch semantics need review if exposed. |
| `multiqc_report` | `MULTIQC.out.report` and `NFCORE_DEMO.out.multiqc_report` | `html` data | high | Primary public report. |
| `multiqc_data` | `MULTIQC.out.data` | directory-like output | low | Galaxy representation needs a concrete tool output decision. |

## Checkpoint Outputs

- Promote `fastqc_zip` and `multiqc_report` for later workflow tests.
- Consider `trimmed_reads` only if branch handling is implemented explicitly.

## Labeling Rules

- Use stable snake-case labels derived from source process/output names.
- Keep source process names in step docs or TODO notes for later tool implementation.

## Confidence

- High: sample-sheet detection, `skip_trim` branch, FastQC and MultiQC public report outputs.
- Medium: Galaxy representation for optional custom MultiQC config and conditional trimmed reads.
- Low: directory-like `multiqc_data` and logo datatype.

## Open Questions

- Should the minimal Galaxy target preserve `skip_trim`, or fix trimming on/off for a simpler first skeleton?
- Should custom MultiQC config/logo remain public workflow inputs?
- How should Galaxy represent MultiQC data/plots directory outputs in this translation?
