# Galaxy Data-Flow Brief — cwl-userguide-1st-workflow

## Topology (abstract)

Two-step linear DAG, no fan-out / fan-in / scatter:

```
tarball ────────────────────────┐
name_of_file_to_extract ──┐     │
                          ▼     ▼
                    [ untar (tar-param.cwl) ] ─ extracted_file ─▶ [ compile (arguments.cwl) ] ─ classfile ─▶ compiled_class
```

Edges (from `summary-cwl.graph.edges[]`, no `via` markers — no shape-affecting CWL features):

| From | To | Galaxy reshape |
| --- | --- | --- |
| `tarball` (workflow input) | `untar/tarfile` | direct dataset wire |
| `name_of_file_to_extract` (workflow input) | `untar/extractfile` | parameter passed as text |
| `untar/extracted_file` | `compile/src` | direct dataset wire |
| `compile/classfile` | `compiled_class` (workflow output) | direct dataset wire |

## Galaxy collection semantics

Not applicable. No `File[]`, no scatter, no records, no Directory, no secondaryFiles, no `linkMerge`/`pickValue`. Everything is single-dataset / single-parameter.

## Abstract step list (placeholder)

| Galaxy step id | Abstract operation | CWL origin | Inputs | Outputs | Notes |
| --- | --- | --- | --- | --- | --- |
| `untar` | Extract a named file from a tar archive | `tar-param.cwl` (`tar --extract --file <tarball> <extractfile>`) | `tarball` (dataset, tar), `name_of_file_to_extract` (param, text) | `extracted_file` (dataset) | Single-file extraction with a chosen member name. Galaxy tool likely needs to expose both `--file` and the positional member name. |
| `compile` | Compile a Java source file with `javac` to an output dir | `arguments.cwl` (`javac -d $(runtime.outdir) <src>`) | `extracted_file` (dataset, java source) | `classfile` (dataset, `*.class`) | DockerRequirement hint `openjdk:9.0.1-11-slim` carried for reference; Galaxy will pin its own container via a wrapper. |

## Unresolved Galaxy tool needs

- **`untar` tool**: Existing Galaxy `tar_extract` / archive-extraction wrappers should be searched in the per-step authoring loop. The CWL semantics select a specific member by name (not "extract everything"); confirm an existing Galaxy tool supports this single-member shape, otherwise a custom wrapper is needed.
- **`compile` tool (javac)**: No common Galaxy use case for invoking `javac` on user-supplied `.java` files. High likelihood of needing `author-galaxy-tool-wrapper` rather than `discover-shed-tool`. Flag this for the discover-or-author branch.

## Placeholder transformations / reviewable expressions

- `tar-param.cwl#extracted_file` glob is `$(inputs.extractfile)` — Galaxy wrapper will need to emit a single output file whose name comes from the user-supplied parameter. Trivially expressible in a Galaxy tool definition; not a reshape concern.
- `arguments.cwl#arguments` uses `$(runtime.outdir)` — Galaxy wrappers receive an output directory naturally, so this is a runtime convenience, not a translation problem.

## Confidence

- **High**: topology, edge wiring, absence of collection semantics.
- **Medium**: abstract operation labels.
- **Low–medium**: Galaxy tool availability for `untar` (member-selected extraction) and especially `javac`.

## Open questions

- Does a Galaxy Tool Shed wrapper exist that exposes member-selected tar extraction, or only "extract-all-into-collection" style?
- Is there *any* IWC precedent for compiling Java in a workflow? If not, treat `compile` as a custom tool authoring problem.
- Should the data-flow brief promote `extracted_file` to an exposed checkpoint output? Interface brief said no; sticking with that.

## Non-decisions (deferred downstream)

- gxformat2 skeleton & step ordering — `cwl-summary-to-galaxy-template`.
- Concrete tool ids, parameter wiring — per-step authoring loop.
- Test plan — `cwl-test-to-galaxy-test-plan`.
