# author-galaxy-tool-wrapper eval

## Case: conda-only Nextflow process

- check: deterministic
- fixture: Nextflow process summary with a bioconda-only environment directive, explicit command, declared inputs, declared outputs, and minimal test fixture evidence.
- expectation: authors a Galaxy `GalaxyUserTool` YAML definition whose container/package evidence matches the conda spec, whose `shell_command` preserves the process command intent, and whose UDT passes structural validation plus mandatory critic review.

## Case: biocontainers Docker URI

- check: llm-judged
- fixture: Nextflow process summary with a BioContainers Docker URI, command stanza, input/output declarations, and no acceptable Tool Shed discovery hit.
- expectation: derives a plausible conda-equivalent requirement set, preserves command-stanza fidelity, and records uncertainty where container-to-conda mapping is not directly evidenced.

## Case: discovery fallthrough against IWC-wrapped tools

- check: llm-judged
- fixture: process needs corresponding to IWC-wrapped tools such as fastp and samtools where wrapper discovery should normally succeed.
- expectation: does not author a duplicate UDT unless discovery evidence is unacceptable; explains why the fallthrough was justified and compares the authored UDT shape against the existing IWC wrapper's behavior.
