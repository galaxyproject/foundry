# Bacass interface fixture

Source: nf-core/bacass 2.5.0, manifest SHA 76e4b12cacdc242891ea57e723c5e273f4ac71b4.
Maintainer-authored preceding-phase input for the summarize-nextflow handoff scenario.

Expose samplesheet rows as identifier-preserving sample records with short paired
reads and optional long reads. Preserve sample metadata through collection maps.
Expose assembler choice and source skip/annotation flags as parameters; optional
read branches must preserve the sample key. Published assembly FASTA, assembly
quality reports, annotation outputs, and aggregate QC reports are draft output
intents. Exact output labels and datatypes remain open where source summary
patterns do not establish them; do not invent final Galaxy step or Tool Shed IDs.

The source summary is authoritative for process IO, conditionals and packages.
Reference inputs and rebuild choices come from the companion reference-data brief.
