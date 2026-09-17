# Workflow Brief: Read alignment subset

## Objective

Produce aligned reads and basic quality reports for each sample. This example is
illustrative; the source and environment have not been verified.

## Sources

The interview in `interview.md` requests paired-end read processing through
alignment. Confirm this source is available before relying on it. The exact
reference assembly is still unknown.

## Scope

### Included

- Quality reports for paired-end reads.
- Alignment against a supplied reference.

### Excluded

- Variant calling.
- Reference database construction.

## Inputs and outputs

| Role | Required shape | Notes |
| --- | --- | --- |
| Reads | Paired-end reads grouped by sample | Prefer a Galaxy list of pairs. |
| Reference | One reference FASTA | Assembly and exact file remain undecided. |
| Alignments | One coordinate-sorted BAM per sample | Preserve sample identifiers. |
| Quality reports | Per-sample read quality reports | Keep reports attributable to the input samples. |

## Constraints

Preserve sample identifiers in the output collections. This is mandatory so
reports and alignments remain attributable to the same sample.

The reference is supplied by the caller; do not expand this brief into a
reference construction workflow. Propose tool substitutions for review before
changing the scientific behavior.

## Environment

### Authoring

The agent needs Foundry and gxwf. Required versions, installation method,
writable workspace, and network access have not been established.

### Execution

The target is Galaxy. Managed versus external Galaxy, Galaxy version,
container policy, writable paths, and resource limits remain undecided.
The reference genome must be supplied before execution. These are intended
requirements, not claims that an environment has passed preflight.

## Acceptance criteria

Each input sample yields one readable, coordinate-sorted BAM and a quality
report, preserving identifiers. Use a small paired-end fixture; its location
is still unknown. Agree on the fixture and expected results before reporting
runtime success.

## Open questions

- **Blocks execution:** Which assembly and exact reference file should be used?
- **Blocks execution:** Which Galaxy mode and container policy apply?
- **Blocks execution:** Which small fixture establishes the acceptance criteria?

## Decisions and learning

No implementation attempt has been made yet. Record expert decisions with their
rationale, and link findings from each attempt to the evidence that supports them.

## Related artifacts

None yet. Link source summaries, detailed design handoffs, the draft workflow,
and the test plan as they become available.
