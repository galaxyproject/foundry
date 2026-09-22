# Workflow Brief: Read quality reports

## Workflow

### Objective

Produce read quality reports attributable to each selected sample.

### Sources

Use the committed nf-core/demo source summary at pin
45904cb9d12db3d89900e6c479fe604ef71b297b as evidence. The expert selects
read quality reporting only; source trimming and aggregate reporting are excluded.

### Scope

#### Included

Read quality reporting for the selected samples.

#### Excluded

Trimming, alignment, variant calling, and aggregate reporting.

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
