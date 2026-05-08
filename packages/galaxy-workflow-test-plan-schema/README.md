# @galaxy-foundry/galaxy-workflow-test-plan-schema

JSON Schema for the Foundry's Galaxy workflow test-plan handoff format.

This is the intermediate contract emitted by source-test translation Molds such as `nextflow-test-to-galaxy-test-plan` and `cwl-test-to-galaxy-test-plan`. It is consumed by `implement-galaxy-workflow-test`, which authors the final `tests-format` YAML.

## CLI

```sh
validate-galaxy-workflow-test-plan galaxy-workflow-test-plan.json
```

Exit codes:

- `0` valid
- `3` schema-validation failure
- `1` input or JSON read error

## Library

```ts
import { validateGalaxyWorkflowTestPlan } from "@galaxy-foundry/galaxy-workflow-test-plan-schema";

const result = validateGalaxyWorkflowTestPlan(data);
```

Generated skills should prefer the CLI validator so failures are reproducible from logs.
