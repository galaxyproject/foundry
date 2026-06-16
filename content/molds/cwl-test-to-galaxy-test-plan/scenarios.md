# cwl-test-to-galaxy-test-plan scenarios

Concrete cases for `cwl-test-to-galaxy-test-plan`, exercised against the abstract properties in `eval.md`. Each case binds a fixture and states what it exercises; the `eval.md` oracle is applied to whatever the case produces.

## Case: schema-valid translated test plan

- fixture: CWL workflow with job input object, expected outputs, secondary files, and collection-like array inputs.
- expect: emits a YAML Galaxy workflow test plan that validates against the [[galaxy-workflow-test-plan]] schema via `foundry validate-galaxy-workflow-test-plan`.

## Case: plan-not-final-tests boundary

- fixture: cast skill output for a representative CWL workflow summary and test fixture.
- expect: output describes a Galaxy workflow test plan, not concrete test details that belong only in the Galaxy `tests-format` schema. Every test description carries provenance and evidence for its inputs, expected outputs, assertion intent, tolerances, and omissions.

## Case: workflow-aware compatibility

- fixture: translated Galaxy workflow test plan plus matching draft Galaxy workflow skeleton when available.
- expect: plan records the workflow labels, collections, and datatypes it depends on when a draft workflow is available, or records unresolved mapping assumptions when evaluating from the CWL summary alone.
