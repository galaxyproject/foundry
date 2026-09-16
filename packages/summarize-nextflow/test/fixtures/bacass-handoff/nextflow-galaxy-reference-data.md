# Bacass reference-data fixture

Source: nf-core/bacass 2.5.0, manifest SHA 76e4b12cacdc242891ea57e723c5e273f4ac71b4.
Maintainer-authored preceding-phase input for the summarize-nextflow handoff scenario.

Preserve optional reference FASTA and source database inputs, including Kraken2,
Bakta, and the annotation/quality reference inputs recorded in reference_assets.
Keep database resources coordinated with their tool/annotation choice. The
summary's Bakta rebuild rule is a source-side obligation: retain its guard and
builder intent when no Bakta database is supplied. Do not turn FASTQC/FASTP skip
flags into reference rebuilds. Large database packaging and exact Galaxy carrier
shape remain open requirements; no Tool Shed availability decision is made here.
