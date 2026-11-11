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
summary: "Galaxy wrappers that replace a common tool at lower compute cost, the rule for swapping them in, and when to keep the original."
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
  - "[[galaxy-workflow-draft-format]]"
  - "[[component-tool-shed-search]]"
related_molds:
  - "[[discover-shed-tool]]"
  - "[[advance-galaxy-draft-step]]"
  - "[[nextflow-summary-to-galaxy-template]]"
  - "[[cwl-summary-to-galaxy-template]]"
  - "[[freeform-summary-to-galaxy-template]]"
  - "[[workflow-brief-to-galaxy-template]]"
  - "[[review-galaxy-workflow]]"
  - "[[mature-galaxy-workflow-for-iwc]]"
---

# Efficient Galaxy tool substitutions

Some tools that source workflows name have a Galaxy wrapper that does the same job for less compute. When a Galaxy workflow the Foundry builds needs one of the tools in the table below, emit the replacement wrapper instead, unless one of that row's opt-out conditions holds. Record every swap so a reviewer can see it and reverse it.

The table serves the goal of the [ESG4STARS](https://galaxyproject.org/hall-of-fame/esg4stars/) project: cut the compute, transfer, and storage footprint of scientific analyses. The saving applies on any Galaxy server that runs the workflow. A step that runs once per sample in every invocation of a published workflow multiplies it by the number of samples and invocations. That is why the table starts with per-read QC.

This is a Foundry policy, not an IWC convention. The IWC corpus observed by the Foundry contains no use of any replacement below, so a swap never cites corpus evidence. It cites this note.

## Substitution table

| Replaces | Replacement wrapper | TRS id | Port names | Opt out when |
| --- | --- | --- | --- | --- |
| FastQC (`devteam/fastqc/fastqc`, `fastqc` executable) | Falco (`iuc/falco/falco`) | `iuc~falco~falco` | Same: `input_file` in, `html_file` and `text_file` out | See [FastQC to Falco](#fastqc-to-falco) |

## Applying a substitution

A Mold that picks a tool identity applies the table at the moment it picks. That is the template Molds for steps they resolve or pin, and [[discover-shed-tool]] for every Tool Shed lookup.

1. **Match.** A step matches a row when its source executable, the need handed to discovery, or a pinned `tool_id` names the tool in the **Replaces** column.
2. **Check the opt-outs.** Read the step's source evidence against the row's opt-out conditions. If one holds, keep the original tool and record why. Do not swap and hope.
3. **Emit the replacement by exact identity.** Pin the owner and repository in the row. A free-text Tool Shed search can rank a different wrapper first (see [FastQC to Falco](#fastqc-to-falco)), so never let search choose the replacement.
4. **Map the parameters.** Carry each source setting to its counterpart in the row's parameter mapping. A setting with no counterpart is an opt-out condition, not a silent drop.
5. **Record the swap.** Where the Mold carries the [[open-requirements-ledger]], append a `decision` with `id: substitute-<original>-with-<replacement>-<step label>`, the step label, and a `rationale` naming this note. [[discover-shed-tool]] records it as an `efficient-substitution` warning instead, and [[advance-galaxy-draft-step]] copies that warning into the ledger as a decision. A kept original gets the same decision with `decision: "Keep <original>"` and the opt-out that applied.

A user or Workflow Brief that names the original tool explicitly, and says why, overrides the table for that step. A source that merely uses the original, as nf-core's `FASTQC` module does, is not such a request.

## Reviewing an existing workflow

[[review-galaxy-workflow]] and [[mature-galaxy-workflow-for-iwc]] look at workflows the Foundry did not build. For those, the table produces advice, never an edit. Report each step that uses a tool in the **Replaces** column as an advisory finding: name the step, the replacement wrapper, and any opt-out condition the step's settings already show. Label the finding as Foundry efficiency advice, distinct from the IWC review policy, which does not require it.

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
- **Line rewrites.** The MGnify amplicon QC workflows rewrite the `Filename` line with a find-and-replace on `\t(.*?)\.gz` to relabel samples before MultiQC. Check the substituted step's `Filename` value before keeping such a rewrite, since it depends on how the wrapper names its input.

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

### Tests

Assert on `text_file` structure: a module header line such as `has_text: ">>Per base sequence quality"`, or a Basic Statistics line such as `Total Sequences`. Do not assert `##FastQC`, which Falco does not write. Do not compare either report byte for byte against FastQC output, do not assert on duplication values, and do not assert on HTML text specific to FastQC's report layout. When translating source tests, such as an nf-test snapshot of FastQC outputs, carry over only assertions that survive these rules, and record each one you drop.

## Adding a substitution

Add a row only when all of these are true:

- The replacement runs the same analysis on the same inputs, and a published source or the tool's documentation says so.
- The replacement's Galaxy wrapper is published on the main Tool Shed by a maintained owner, such as `iuc` or `devteam`.
- Its ports can take the original's place, or the row says exactly how edges rewire.
- Every way its results can differ from the original's is either harmless to downstream steps or listed as an opt-out condition.

Write the row's own section with the wrapper identity, port and parameter tables, opt-outs, and test guidance, as for Falco above.

## Open questions

- Falco's speed and memory advantage over FastQC has not been measured on Galaxy jobs by the Foundry. Job metrics from Galaxy servers running both tools would turn this note's rationale into a number.
- The Falco wrapper does not expose Falco's `--orig-dups` option, which restores FastQC's duplication method. If it did, the duplication opt-out would become a parameter setting instead.
