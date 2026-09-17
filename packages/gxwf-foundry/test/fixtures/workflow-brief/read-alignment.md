# Workflow Brief: Read alignment subset

## Workflow

### Objective

Produce aligned reads and basic quality reports attributable to each sample.
This is an illustrative interview-derived brief, not a verified environment.

### Sources

The interview requests paired-end read processing through alignment against a
caller-supplied reference. The exact reference assembly remains undecided.

### Scope

#### Included

- Read quality reporting.
- Alignment against a supplied reference.

#### Excluded

- Variant calling.
- Reference database construction.

### Inputs and outputs

The caller describes paired-end reads grouped by sample and a reference
sequence file. Desired results are sample-attributable alignments and quality
reports. The Galaxy datatypes, collection structure, and interface labels are
to be determined during design.

### Requirements and preferences

Preserve sample identifiers so reports and alignments remain attributable to
the same sample. The reference is supplied by the caller; keep reference
construction outside scope.

### Acceptance criteria

The selected samples yield interpretable alignments and quality reports with
sample identity preserved. Test development will choose fixtures and assertions.

### Open questions

Would an aggregate quality report be useful in addition to individual reports?
This optional report does not prevent proceeding with the selected scope.

### Blockers

- The expert must select the reference assembly and exact reference file.

## Agent Environment

### Tooling

Expected tooling is Foundry, gxwf, and Planemo. Versions and availability have
not been checked. A separate preflight must record observed availability.

### Constraints

Workspace permissions and network access have not been established.

### Containerization

The caller prefers containers. Docker, Singularity, and Apptainer usability
have not been checked.

### Blockers

- Establish a usable agent environment before implementation.
