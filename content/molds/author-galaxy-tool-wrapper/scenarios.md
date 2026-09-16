# author-galaxy-tool-wrapper scenarios

## Case: conda-only Nextflow process

- fixture: Nextflow process summary with a bioconda-only environment directive,
  explicit command, declared inputs, declared outputs, and minimal test fixture
  evidence.
- expect: authors a Galaxy `GalaxyUserTool` YAML definition whose
  container/package evidence matches the conda spec, whose `shell_command`
  preserves the process command intent, and whose UDT passes structural
  validation plus mandatory critic review.

## Case: biocontainers Docker URI

- fixture: Nextflow process summary with a BioContainers Docker URI, command
  stanza, input/output declarations, and no acceptable Tool Shed discovery hit.
- expect: derives a plausible conda-equivalent requirement set, preserves
  command-stanza fidelity, and records uncertainty where container-to-conda
  mapping is not directly evidenced.

## Case: discovery fallthrough against IWC-wrapped tools

- fixture: process needs corresponding to IWC-wrapped tools such as fastp and
  samtools where wrapper discovery should normally succeed.
- expect: does not author a duplicate UDT unless discovery evidence is
  unacceptable; explains why the fallthrough was justified and compares the
  authored UDT shape against the existing IWC wrapper's behavior.

## Case: executable brief without Nextflow

- fixture: supply this task brief directly, with no Nextflow summary or module:
  discovery returned `miss` for the requested custom line-counting behavior;
  id `count_lines`, version `1.0.0`, name `Count text lines`; container
  `python:3.12.0`; one text dataset input `text_file`; command
  `python3 -c 'import sys; print(sum(1 for _ in open(sys.argv[1])))' INPUT > count.txt`;
  one text dataset output `count`, captured from `count.txt`. Test input bytes
  are `alpha\nbeta\n`, and expected output bytes are `2\n`.
- expect: authors UDT YAML such as `examples/galaxy-user-tool.yml` using only
  the brief and generic UDT references;
  preserves the supplied image and counting behavior; passes structural
  validation and critic review; requests no Nextflow artifact and emits no XML
  or Cheetah syntax.

## Case: standalone process evidence without its parent summary

- fixture: supply this process evidence directly with discovery result `miss`:
  name `COUNT_LINES`; container `python:3.12.0`; input `path(text_file)`;
  output `path("count.txt"), emit: count`; script
  `python3 -c 'import sys; print(sum(1 for _ in open(sys.argv[1])))' ${text_file} > count.txt`.
  A summary row may additionally carry unresolved `tool_id: "PYTHON"`; no parent
  summary or tools registry is supplied. Use the same two-line text input and
  expected `2\n` output as the preceding case.
- expect: uses the explicit script, paths, and container as sufficient evidence
  to author the counting UDT in `examples/galaxy-user-tool.yml`;
  does not apply whole-summary validation or fabricate a `PYTHON` registry row;
  produces a structurally valid, critic-reviewed UDT with the same observable
  counting behavior and records any unresolved provenance reference.
