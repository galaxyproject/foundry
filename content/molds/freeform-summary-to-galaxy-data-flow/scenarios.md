# freeform-summary-to-galaxy-data-flow scenarios

Concrete cases for `freeform-summary-to-galaxy-data-flow`, exercised against the abstract properties in `eval.md`. Each case binds a fixture and states its expected values; the `eval.md` oracle is applied to whatever the case produces.

## Case: multi-step analysis with interface brief

- fixture: a freeform summary describing a multi-step analysis plus its interface brief.
- expect: draft includes the source's described operations and their order as facts, marks map-over vs aggregate steps, and does not present unresolved gather/merge behavior as already-implemented Galaxy wiring.

## Case: mixed per-sample, aggregation, and reshaping steps

- fixture: a freeform summary whose steps mix per-sample processing, aggregation, and tabular reshaping.
- expect: draft classifies each operation as wiring, collection semantics, an explicit placeholder step, or a review trigger. Low-confidence or under-specified operations become open questions instead of invented Galaxy tools.

## Case: per-sample input through map then aggregate

- fixture: a freeform summary with a per-sample/sample-sheet input and at least one mapped step followed by an aggregate.
- expect: draft keeps the collection shape and identifier/metadata story visible from input through mapped steps and any gather/reduce step.

## Case: non-trivial summary with multiple analysis steps

- fixture: any non-trivial freeform summary with multiple analysis steps.
- expect: draft lists unresolved Galaxy tool or placeholder needs with enough source context for later tool discovery and template authoring, but does not resolve exact Tool Shed IDs or detailed parameters.

## Case: full handoff to template Mold

- fixture: source summary, interface brief, and data-flow brief.
- expect: `freeform-summary-to-galaxy-template` can turn the draft into workflow inputs, placeholder steps, rough connections, and TODO notes without asking for missing basics such as step names, operations, or open questions.
