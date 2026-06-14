# cwl-test-to-galaxy-test-plan eval

This file is the **abstract oracle** for the `cwl-test-to-galaxy-test-plan` Mold: properties any translated Galaxy workflow test plan must satisfy, independent of fixture. Concrete fixtures and their expected values live in `scenarios.md`; the oracle here is applied to whatever a scenario produces.

## Property: schema-valid translated test plan

- bucket: schema-valid translated test plan
- check: deterministic
- assertion: the Mold emits a Galaxy workflow test plan that validates against the handoff schema selected for Galaxy workflow tests.

## Property: plan-not-final-tests boundary

- bucket: plan-not-final-tests boundary
- check: llm-judged
- assertion: output describes a Galaxy workflow test plan, not concrete test details that belong only in the Galaxy `tests-format` schema. Every test description carries provenance and evidence for its inputs, expected outputs, assertion intent, tolerances, and omissions.

## Property: workflow-aware compatibility

- bucket: workflow-aware compatibility
- check: deterministic
- assertion: plan records the workflow labels, collections, and datatypes it depends on when a draft workflow is available, or records unresolved mapping assumptions when evaluating from the CWL summary alone.
