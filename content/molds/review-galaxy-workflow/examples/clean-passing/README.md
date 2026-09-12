# Short Read Quality Control

This workflow runs FastQC on one short-read sequencing dataset and aggregates the
report with MultiQC to generate a single quality-control summary. Use it to get one
readable report for a sequencing run before deciding whether the data is fit for
downstream analysis. No reads are modified and nothing is trimmed.

## Inputs

| Name | Class | Format | Notes |
| --- | --- | --- | --- |
| Sequencing Reads | dataset | `fastqsanger` | One short-read sequencing dataset. Compressed input should be uploaded as `fastqsanger.gz` and converted before it is supplied here. |

Both steps run with tool defaults. The MultiQC step is configured only to read FastQC
text reports; no sample name, reference, genomic region, or other dataset-specific
value is fixed anywhere in the workflow, so it can be run against lab data without
editing it.

## Outputs

| Name | Format | Description |
| --- | --- | --- |
| MultiQC Report | `html` | One HTML quality-control report aggregating the FastQC results, including the General Statistics table. |

## Resources

- Galaxy Training Network — [Quality Control](https://training.galaxyproject.org/training-material/topics/sequence-analysis/tutorials/quality-control/tutorial.html)
- [FastQC documentation](https://www.bioinformatics.babraham.ac.uk/projects/fastqc/)
- [MultiQC documentation](https://multiqc.info/)

Reading a tutorial is not required to run this workflow: supply one dataset and read
the report.

## Related workflows

Other quality-control workflows in this organization take a paired collection and trim
adapters before reporting, and emit trimmed reads alongside the report. Prefer one of
those when you need trimmed reads as an output, or when you are processing many samples
at once. Prefer this workflow when you want one report for one dataset and no reads
should be modified.
