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

## Case: discovery returns `hit` — do not author UDT

- fixture: a `discover-shed-tool` result with `status: "hit"` for `fastp`,
  where the discovered wrapper is structurally acceptable.
- expect: the mold stops at §1, returns the discovered tool reference to
  `implement-galaxy-tool-step`, and does not emit `galaxy-user-tool.yml`.
  Any attempt to author a UDT in this state is a defect.

## Case: discovery returns `unsuitable` — escalate, do not duplicate

- fixture: a `discover-shed-tool` result with `status: "unsuitable"` for an
  existing tool (e.g., a wrapper for the right name but wrong version or
  incompatible interface).
- expect: the mold records the `unsuitable` rationale and escalates to the
  harness. It must not author a duplicate wrapper for a tool that already
  exists. The emitted output must not be a `galaxy-user-tool.yml`.

## Case: discovery returns `miss` — author UDT

- fixture: a `discover-shed-tool` result with `status: "miss"` for a tool
  that is genuinely absent from the Tool Shed, with sufficient command and
  container evidence in the source summary.
- expect: the mold proceeds with authoring and emits a structurally valid
  `galaxy-user-tool.yml` that passes the mandatory critic pass.

## Case: discovery fallthrough against IWC-wrapped tools (legacy)

- fixture: process needs corresponding to IWC-wrapped tools such as fastp and
  samtools where wrapper discovery should normally succeed.
- expect: does not author a duplicate UDT; explains why the discovery result
  was `miss` or why the harness recorded an explicit `fallthrough` with a
  documented reason. Compares the authored UDT shape (if any) against the
  existing IWC wrapper's behavior.