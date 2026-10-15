# Workflow Brief: Read quality reports

## Workflow

### Objective

Produce read quality reports attributable to each selected sample.

### Scope

#### Included

Read quality reporting for the selected samples.

#### Excluded

Alignment, variant calling, and aggregate reporting.

### Inputs and outputs

The caller supplies sequencing reads grouped by sample. The desired results
are sample-attributable quality reports. Galaxy representations are left to design.

### Requirements and preferences

Preserve sample identity. Do not add analyses outside the selected scope.

## Agent Environment

### Tooling

Expected tooling is gxwf, foundry, and planemo. This fixture records no observed
availability; the harness must collect current preflight evidence before design.

### Containerization

Prefer containers if supported by the selected environment. No usable engine
is asserted by this fixture; the harness must verify it during preflight.
