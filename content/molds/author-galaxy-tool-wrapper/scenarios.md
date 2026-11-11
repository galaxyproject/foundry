# author-galaxy-tool-wrapper scenarios

## Case: discovery hits

- fixture: `nf-core/rnaseq` 3.24.0 (`workflow-fixtures/fixtures.yaml`), process
  `FASTP` (`modules/nf-core/fastp/main.nf`), with a [[discover-shed-tool]]
  result of `status: hit` on `iuc/fastp/fastp`.
- expect: stops at §1, emits no `galaxy-user-tool.yml`, and returns
  `iuc/fastp/fastp` to the caller.

## Case: Bioconda tool with a BioContainers image

- fixture: `nf-core/rnaseq` 3.24.0, process `FQ_LINT`
  (`modules/nf-core/fq/lint/main.nf`), with a [[discover-shed-tool]] result of
  `status: miss`.
- expect: container `quay.io/biocontainers/fq:0.12.0--h9ee0642_0` (the
  pipeline's `docker.registry` is `quay.io`) and package `fq` 0.12.0. The
  `shell_command` runs `fq lint` on a FASTQ data input and writes its report to
  a declared text output. The UDT passes structural validation and critic
  review.

## Case: Bioconda tool with a Wave image

- fixture: `nf-core/rnaseq` 3.24.0, process `RIBODETECTOR`
  (`modules/nf-core/ribodetector/main.nf`), with a [[discover-shed-tool]]
  result of `status: miss`.
- expect: package `ribodetector` 0.3.3 and container
  `community.wave.seqera.io/library/ribodetector:0.3.3--ad3d7071e408b502`, not
  an invented BioContainers tag. The `shell_command` runs `ribodetector_cpu`,
  the source's branch without an accelerator, with `-l` from an integer
  read-length input.
