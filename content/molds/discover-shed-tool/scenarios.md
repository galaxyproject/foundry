# discover-shed-tool scenarios

Concrete cases for `discover-shed-tool`, exercised against the abstract
properties in `eval.md`. Each case binds a step need and states its expected
recommendation; the `eval.md` oracle is applied to whatever the case produces.

## Case: fastqc exact hit

- fixture: step need `quality control for FASTQ reads using FastQC`
- expect: recommends an installable FastQC Tool Shed wrapper with owner, repo,
  tool id, version, and changeset revision.
