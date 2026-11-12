---
type: research
title: "Efficient Galaxy tool substitutions"
tags:
  - target/galaxy
component: "Galaxy tool selection"
status: draft
created: 2026-11-11
revised: 2026-11-11
revision: 1
summary: "Galaxy wrappers that replace a common tool at lower compute cost, how their ports and parameters map, and when to keep the original."
sources:
  - "https://galaxyproject.org/hall-of-fame/esg4stars/"
  - "https://github.com/smithlabcode/falco"
  - "https://doi.org/10.12688/f1000research.21142.2"
  - "https://github.com/galaxyproject/tools-iuc/blob/main/tools/falco/falco.xml"
  - "https://github.com/galaxyproject/tools-iuc/blob/main/tools/fastqc/rgFastQC.xml"
  - "https://docs.seqera.io/multiqc/modules/fastqc"
  - "https://github.com/smithlabcode/falco/blob/master/src/report.cpp"
related_notes:
  - "[[open-requirements-ledger]]"
  - "[[component-tool-shed-search]]"
related_molds:
  - "[[improve-galaxy-workflow-efficiency]]"
---

# Efficient Galaxy tool substitutions

Some tools common in Galaxy workflows have a replacement wrapper that does the same job for less compute. Each row below names the original, its replacement, how the replacement's ports and parameters map onto the original's, and the conditions under which the original has to stay. [[improve-galaxy-workflow-efficiency]] reads this table to propose swaps in an existing workflow.

The table serves the goal of the [ESG4STARS](https://galaxyproject.org/hall-of-fame/esg4stars/) project: cut the compute, transfer, and storage footprint of scientific analyses. The saving applies on any Galaxy server that runs the workflow. A step that runs once per sample in every invocation of a published workflow multiplies it by the number of samples and invocations. That is why the table starts with per-read QC.

This is Foundry guidance, not an IWC convention. The IWC corpus observed by the Foundry contains no use of any replacement below, so a swap never cites corpus evidence. It cites this note.

## Substitution table

| Replaces | Replacement wrapper | Replacement `tool_id` | Port names | Opt out when |
| --- | --- | --- | --- | --- |
| FastQC (`devteam/fastqc/fastqc`) | Falco (`iuc/falco/falco`) | `toolshed.g2.bx.psu.edu/repos/iuc/falco/falco` | Same: `input_file` in, `html_file` and `text_file` out | See [FastQC to Falco](#fastqc-to-falco) |

A row applies to a step whose `tool_id` names the original's owner, repository, and tool id, at any version. Pin the replacement by the exact `tool_id` in the row. A free-text Tool Shed search can rank a different wrapper first, as the FastQC row shows.

## FastQC to Falco

[Falco](https://github.com/smithlabcode/falco) is a reimplementation of FastQC in C++, published as "Falco: high-speed FastQC emulation for quality control of sequencing data" (de Sena Brandine and Smith, F1000Research 2021, 8:1874). Its output files carry FastQC's names and formats: `fastqc_report.html`, `fastqc_data.txt`, and `summary.txt`. MultiQC's FastQC module describes Falco as a drop-in replacement and parses its `fastqc_data.txt` with the same `*fastqc_data.txt` search pattern it uses for FastQC.

### Wrapper identity

Pin `toolshed.g2.bx.psu.edu/repos/iuc/falco/falco` and resolve the version and changeset as for any Tool Shed wrapper. On 2026-11-11 the newest published version was `1.3.2+galaxy0`.

Do not search for it by name. `gxwf tool-search falco` ranks `mhh-hematology/falcoamadeus` first, a separate tool with a different interface, and lists `duijker.d/naturalis_fastqc/runFalco` third.

### Ports

Both wrappers take one dataset as `input_file` and declare outputs with the same names and formats, so edges into and out of a FastQC step rewire without renaming.

| Port | FastQC (`0.74+galaxy1`) | Falco (`1.3.2+galaxy0`) |
| --- | --- | --- |
| `input_file` | `fastq`, `fastq.gz`, `fastq.bz2`, `bam`, `sam` | `fastq`, `fastq.gz`, `bam`, `sam` |
| `html_file` | `html` report | `html` report |
| `text_file` | `txt`, the `fastqc_data.txt` contents | `txt`, the `fastqc_data.txt` contents |
| `summary_file` | — | `txt`, pass/warn/fail per module. Produced only when `generate_summary` is true |

The `text_file` contents follow FastQC's module layout (`>>Basic Statistics`, `>>Per base sequence quality`, and so on, each closed by `>>END_MODULE`), but the first line differs. FastQC writes `##FastQC` and its version, and Falco writes `##Falco` and its version. MultiQC accepts both.

In the 7 IWC workflows observed with FastQC (22 steps), `text_file` goes to three kinds of consumer:

- **MultiQC**, in the RNA-seq and nanopore workflows. No change needed.
- **Line filters.** `Nanopore-Pre-Processing` greps `text_file` for `Total Sequences`, a Basic Statistics line Falco also writes.
- **Line rewrites.** The MGnify amplicon QC workflows rewrite the `Filename` line with a find-and-replace on `\t(.*?)\.gz` to relabel samples before MultiQC. The value on that line depends on how each wrapper names its input, and the Foundry has not confirmed that Falco's wrapper writes the same value, so this is an opt-out for now.

A consumer that matches the `##FastQC` header line breaks after the swap. Treat it as an opt-out, or change its pattern in the same edit.

### Parameters

| FastQC parameter | Falco parameter | Note |
| --- | --- | --- |
| `contaminants` | `contaminants` | Same tabular format |
| `adapters` | `adapters` | Same tabular format |
| `limits` | `limits` | Same text format |
| `nogroup` | `nogroup` | Same flag |
| `kmers` | — | Not exposed. The default, `7`, has no counterpart to set |
| `min_length` | — | Not exposed |
| — | `subsample`, `bisulfite`, `reverse_complement`, `generate_summary` | Leave at defaults unless the source sets the matching option |

Every observed IWC FastQC step leaves `kmers` at `7`, `min_length` unset, and `nogroup` false, so each one maps onto Falco's defaults.

### Opt out when

Keep FastQC for a step when any of these holds:

- **Its input can be `fastq.bz2`.** Falco's wrapper does not accept it.
- **The source sets `kmers` to a value other than 7, or sets `min_length`.** Falco's wrapper cannot express either.
- **Something downstream reads per-read duplication numbers.** Falco computes duplication from a sample of about one million reads, and its README says the numbers "differ dramatically" from FastQC's even though the format is the same. A MultiQC report shown to people is not such a consumer. A step that filters or branches on duplication levels is.
- **Something downstream needs per-tile quality to match FastQC.** Falco analyzes tiles on a tenth of the reads, and its README calls the tile grade slightly unstable.
- **A downstream step matches the `##FastQC` header line** and you are not changing its pattern in the same edit.
- **A downstream step rewrites or matches the `Filename` line.** Until a run confirms Falco's wrapper writes the same value as FastQC's, keep FastQC.

### Tests

Assert on `text_file` structure: a module header line such as `has_text: ">>Per base sequence quality"`, or a Basic Statistics line such as `Total Sequences`. Do not assert `##FastQC`, which Falco does not write. Do not compare either report byte for byte against FastQC output, do not assert on duplication values, and do not assert on HTML text specific to FastQC's report layout. An existing workflow test that asserts one of these on a FastQC output must change with the swap. Name each such assertion in the change-set, so whoever carries the tests forward replaces it rather than discovering it as a failure.

## Adding a substitution

Add a row only when all of these are true:

- The replacement runs the same analysis on the same inputs, and a published source or the tool's documentation says so.
- The replacement's Galaxy wrapper is published on the main Tool Shed by a maintained owner, such as `iuc` or `devteam`.
- Its ports can take the original's place, or the row says exactly how edges rewire.
- Every way its results can differ from the original's is either harmless to downstream steps or listed as an opt-out condition.

Write the row's own section with the wrapper identity, port and parameter tables, opt-outs, and test guidance, as for Falco above. [[improve-galaxy-workflow-efficiency]] picks up a new row without any change to the Mold.

## Open questions

- Falco's speed and memory advantage over FastQC has not been measured on Galaxy jobs by the Foundry. Job metrics from Galaxy servers running both tools would turn this note's rationale into a number.
- Does the Falco wrapper write the same `Filename` value as the FastQC wrapper for the same input? A test run on one of the MGnify QC workflows would settle it and could lift that opt-out.
- The Falco wrapper does not expose Falco's `--orig-dups` option, which restores FastQC's duplication method. If it did, the duplication opt-out would become a parameter setting instead.
