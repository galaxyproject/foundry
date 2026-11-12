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
- expect: call `recommend_biocontainer` with `ribodetector=0.3.3` and use its
  verified exact-version result,
  `quay.io/biocontainers/ribodetector:0.3.3--pyhdfd78af_0`, rather than the Wave
  image. The `shell_command` runs `ribodetector_cpu`, the source's branch without
  an accelerator, with `-l` from an integer read-length input.

## Case: custom Docker Hub image with no BioContainers equivalent

- fixture: `OceanOmics-amplicon-nf` commit `416807e`, LULU process using
  `mahsamousavi/lulu:2019`, with a [[discover-shed-tool]] result of `status:
  miss` and no package evidence that resolves through `recommend_biocontainer`.
- expect: under the default Galaxy policy, stops before writing
  `galaxy-user-tool.yml` and returns an unresolved container requirement. It
  names the source image as provenance and offers a BioContainers image, an
  evidenced target allowlist exception, or an unresolved step as the available
  outcomes.

## Case: several packages resolve as one mulled image

- fixture: a missing-wrapper process whose command requires two pinned Bioconda
  packages and whose source image is outside the default policy.
- expect: one `recommend_biocontainer` call contains both `name=version` specs.
  A verified exact-version mulled-v2 result is policy-checked and used; the
  author does not make two requests or drop either package.

## Case: name-only fallback changes the requested version

- fixture: a missing-wrapper process with a pinned package for which
  `recommend_biocontainer` returns a verified `name_only` image at another
  version.
- expect: no UDT is emitted until the caller confirms the displayed version
  substitution. Refusal or no response leaves an unresolved container
  requirement.

## Case: a target-specific denial overrides a broad allowance

- fixture: target evidence allows `quay.io/*` and denies
  `quay.io/biocontainers/experimental/*`; the selected pinned image is below the
  denied path.
- expect: the image fails policy validation and no UDT is emitted, even though
  it matches the allowed namespace. The unresolved result names the denying
  entry.

## Case: malformed and unpinned default-policy references

- fixture: otherwise valid UDT drafts naming, in turn,
  `docker://quay.io/biocontainers/samtools:1.20--h50ea8bc_1`,
  `quay.io/biocontainers/samtools`, and
  `quay.io/biocontainers-evil/samtools:1.20`.
- expect: all three fail before schema validation: transport scheme, missing
  pin, and repository outside the namespace respectively.

## Case: requested-tool creation reveals a different server policy

- fixture: a completed requested UDT passes the assumed default, but the target
  returns HTTP 400 with its configured allowed entries.
- expect: retain the 400 as target evidence, reevaluate the image, and either
  select and revalidate an allowed equivalent or return unresolved. No separate
  probe UDT is created.

## Case: valid minimal definition reaches both static gates

- fixture: `examples/line-count.galaxy-user-tool.yml`.
- expect: the container passes the default policy check and
  `gxwf validate-tool-source --json --security` reports `valid: true`.

## Case: direct free text inside shell quotes

- fixture: an otherwise valid draft with a top-level `text` input `label` and
  `shell_command: "printf '%s' '$(inputs.label)' > out.txt"`.
- expect: security validation fails at `/shell_command` with
  `dynamic_tool.unsafe_text_interpolation`; the author regenerates the unsafe
  transport instead of adding more shell quoting.

## Case: free text serialized as JSON data

- fixture: the same tool with `params.json` containing
  `$(JSON.stringify(inputs.label))`, a script that parses that file, and a
  `shell_command` that invokes the script without interpolating `label`.
- expect: `gxwf validate-tool-source --json --security` reports `valid: true`.
