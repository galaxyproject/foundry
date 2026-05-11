# Galaxy Interface Brief — cwl-userguide-1st-workflow

## Source provenance

- **Workflow**: `1st-workflow` (CWL User Guide).
- **Entrypoint**: `1st-workflow.cwl` (cwlVersion v1.2).
- **Repo pin**: `common-workflow-language/user_guide @ 546b3844c9e6ea0b2c4700a876e5f96c4de15480`.
- **Validation**: not run (cwltool unavailable in emulation environment); summary extracted by direct YAML walk.

## Workflow inputs

| Galaxy input id | Galaxy label | Shape | Galaxy datatype (seed) | CWL source | Notes |
| --- | --- | --- | --- | --- | --- |
| `tarball` | Tarball to extract | dataset | `tar` | `tarball: File` | No `format` declared in CWL; `tar` is inferred from semantic name and job fixture (`hello.tar`). Confirm before pinning. |
| `name_of_file_to_extract` | Name of file to extract | parameter (text) | `text` | `name_of_file_to_extract: string` | Plain string; no enum/default. Job fixture supplies `Hello.java`. |

No `File[]`, `Directory`, records, or secondaryFiles in this workflow — collection semantics do not apply.

## Workflow outputs

| Galaxy output id | Label | Exposed? | Checkpoint? | Galaxy datatype (seed) | CWL source | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `compiled_class` | Compiled .class file | yes | yes | `binary` (or custom `java_class`) | `compile/classfile` (File, glob `*.class`) | Sole final output of the workflow. No intermediate exposed outputs declared in CWL. |

`untar/extracted_file` is internal-only in the CWL; do not promote unless reviewer flags a debug need.

## Confidence

- **High**: input/output ids, shapes, and source-trace.
- **Medium**: Galaxy datatype seeds — CWL declares no `format:` on either workflow input or output, so datatypes are inferred from file extension conventions and the job fixture. `tar` and `binary` are reasonable defaults; reviewer should confirm before the data-flow step.
- **Low**: label wording — labels here are paraphrased from ids; CWL provides none.

## Open questions

- Should `compiled_class` get a non-`binary` datatype (e.g., a custom `java_class` extension) for downstream usability? CWL does not say.
- Is the `tar` datatype acceptable, or should the Galaxy interface accept the broader `data` and let a converter normalize? CWL does not declare `format`.
- Are there any IWC exemplars with a `tar → extract → compile` shape worth aligning to? Defer to `compare-against-iwc-exemplar` downstream.

## Non-decisions (deferred downstream)

- gxformat2 step wiring, tool selection, parameter passing — `cwl-summary-to-galaxy-data-flow` and the per-step authoring loop.
- Test data shape and assertions — `cwl-test-to-galaxy-test-plan`.
