# freeform-summary-to-galaxy-data-flow eval

Evaluation plan for the `freeform-summary-to-galaxy-data-flow` Mold. These cases look for a useful Galaxy-facing draft of data movement and unresolved operations; exact section names matter less than preserving the handoff and being honest about uncertainty.

## Case: data flow preserves source analysis intent

- bucket: fidelity
- check: llm-judged
- fixture: a freeform summary describing a multi-step analysis plus its interface brief.
- expectation: draft includes the source's described operations and their order as facts, marks map-over vs aggregate steps, and does not present unresolved gather/merge behavior as already-implemented Galaxy wiring.

## Case: operations are classified, not guessed

- bucket: utility
- check: llm-judged
- fixture: a freeform summary whose steps mix per-sample processing, aggregation, and tabular reshaping.
- expectation: draft classifies each operation as wiring, collection semantics, an explicit placeholder step, or a review trigger. Low-confidence or under-specified operations become open questions instead of invented Galaxy tools.

## Case: collection shape survives across nodes

- bucket: fidelity
- check: llm-judged
- fixture: a freeform summary with a per-sample/sample-sheet input and at least one mapped step followed by an aggregate.
- expectation: draft keeps the collection shape and identifier/metadata story visible from input through mapped steps and any gather/reduce step.

## Case: unresolved tool needs are bounded

- bucket: handoff
- check: llm-judged
- fixture: any non-trivial freeform summary with multiple analysis steps.
- expectation: draft lists unresolved Galaxy tool or placeholder needs with enough source context for later tool discovery and template authoring, but does not resolve exact Tool Shed IDs or detailed parameters.

## Case: template Mold can consume the draft

- bucket: handoff
- check: llm-judged
- fixture: source summary, interface brief, and data-flow brief.
- expectation: `freeform-summary-to-galaxy-template` can turn the draft into workflow inputs, placeholder steps, rough connections, and TODO notes without asking for missing basics such as step names, operations, or open questions.
