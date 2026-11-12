# improve-galaxy-workflow-efficiency scenarios

## Case: RNA-seq QC swaps FastQC for Falco

- fixture: `transcriptomics/rnaseq-pe/rnaseq-pe`, summarized by
  [[summarize-galaxy-workflow]].
- expect: one `replace-tool` entry anchored to `FastQC check read qualities`,
  naming `toolshed.g2.bx.psu.edu/repos/iuc/falco/falco` with no version. Its
  acceptance keeps the `text_file` edge into `Combined Quality Report`
  (MultiQC). The collection input declares no format, so the entry's intent
  names the `fastq.bz2` question for the reviewer and the ledger carries an
  open entry for it.

## Case: nanopore QC swaps despite a grep on the text output

- fixture: `microbiome/pathogen-identification/nanopore-pre-processing/Nanopore-Pre-Processing`.
- expect: a `replace-tool` entry for each of its three FastQC steps. Two `Grep1`
  steps match `Total Sequences` in `text_file`, a Basic Statistics line Falco
  also writes, so neither is an opt-out. The read collection declares no
  format, so an entry for a step it feeds directly names the `fastq.bz2`
  question as in the RNA-seq case. A step fed by porechop, whose `format`
  setting is `fastq.gz`, needs no such question.

## Case: MGnify QC keeps FastQC because of a Filename rewrite

- fixture: `amplicon/amplicon-mgnify/mgnify-amplicon-pipeline-v5-quality-control-single-end/mgnify-amplicon-pipeline-v5-quality-control-single-end`.
- expect: no entries. Each of the four FastQC steps feeds a find-and-replace on
  the `Filename` line, so all four are listed as kept with that opt-out, and
  each has a `Keep` decision in the ledger.

## Case: no matching step

- fixture: `transcriptomics/goseq/goseq-go-kegg-enrichment-analsis`.
- expect: a change-set with no entries whose summary names the substitution
  table as the only lever consulted.
