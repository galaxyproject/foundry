# freeform-summary-to-galaxy-data-flow eval

Evaluation plan for the `freeform-summary-to-galaxy-data-flow` Mold. This file is the **abstract oracle**: properties any data-flow brief must satisfy, independent of fixture. Concrete fixtures and their expected values live in `scenarios.md`; the oracle here is applied to whatever a scenario produces. These properties look for a useful Galaxy-facing draft of data movement and unresolved operations; exact section names matter less than preserving the handoff and being honest about uncertainty.

## Property: data flow preserves source analysis intent

- bucket: fidelity
- check: llm-judged
- assertion: the draft includes the source's described operations and their order as facts, marks map-over vs aggregate steps, and does not present unresolved gather/merge behavior as already-implemented Galaxy wiring.

## Property: operations are classified, not guessed

- bucket: utility
- check: llm-judged
- assertion: the draft classifies each operation as wiring, collection semantics, an explicit placeholder step, or a review trigger. Low-confidence or under-specified operations become open questions instead of invented Galaxy tools.

## Property: collection shape survives across nodes

- bucket: fidelity
- check: llm-judged
- assertion: the draft keeps the collection shape and identifier/metadata story visible from input through mapped steps and any gather/reduce step.

## Property: unresolved tool needs are bounded

- bucket: handoff
- check: llm-judged
- assertion: the draft lists unresolved Galaxy tool or placeholder needs with enough source context for later tool discovery and template authoring, but does not resolve exact Tool Shed IDs or detailed parameters.

## Property: template Mold can consume the draft

- bucket: handoff
- check: llm-judged
- assertion: `freeform-summary-to-galaxy-template` can turn the draft into workflow inputs, placeholder steps, rough connections, and TODO notes without asking for missing basics such as step names, operations, or open questions.
