# workflow-brief-to-galaxy-data-flow scenarios

## Case: multi-step analysis with interface brief

- fixture: a reviewed Workflow Brief describing a multi-step analysis, its interface brief, and optional source evidence.
- expect: draft includes the source's described operations and their order as facts, marks map-over vs aggregate steps, and does not present unresolved gather/merge behavior as already-implemented Galaxy wiring.

## Case: mixed per-sample, aggregation, and reshaping steps

- fixture: a reviewed Workflow Brief whose selected work mixes per-sample processing, aggregation, and tabular reshaping.
- expect: draft classifies each operation as wiring, collection semantics, an explicit placeholder step, or a review trigger. Low-confidence or under-specified operations become open questions instead of invented Galaxy tools.

## Case: per-sample input through map then aggregate

- fixture: a reviewed Workflow Brief with a per-sample/sample-sheet input and at least one mapped step followed by an aggregate.
- expect: draft keeps the collection shape and identifier/metadata story visible from input through mapped steps and any gather/reduce step.

## Case: non-trivial summary with multiple analysis steps

- fixture: any non-trivial reviewed Workflow Brief with multiple analysis steps and optional supporting evidence.
- expect: draft lists unresolved Galaxy tool or placeholder needs with enough source context for later tool discovery and template authoring, but does not resolve exact Tool Shed IDs or detailed parameters.

## Case: full handoff to template Mold

- fixture: Workflow Brief, interface brief, data-flow brief, and optional source evidence.
- expect: `workflow-brief-to-galaxy-template` can turn the draft into workflow inputs, placeholder steps, rough connections, and TODO notes without asking for missing basics such as step names, operations, or open questions.
