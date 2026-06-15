# nextflow-summary-to-galaxy-data-flow eval

Evaluation plan for the `nextflow-summary-to-galaxy-data-flow` Mold. This file
is the **abstract oracle**: properties any data-flow draft must satisfy,
independent of fixture. These cases look for a useful Galaxy-facing draft of
data movement and unresolved operations; exact section names are less important
than preserving the handoff. Concrete fixtures and their expected values live in
`scenarios.md`; the oracle here is applied to whatever a scenario produces.
Properties are tagged by bucket:

- **fidelity** — does the draft faithfully carry the source pipeline's data flow?
- **utility** — can operators and tool needs be translated without guessing?
- **handoff** — can the next Mold consume the draft without missing basics?

## Property: data flow preserves source process intent

- bucket: fidelity
- check: llm-judged
- assertion: the draft includes the source pipeline's processes, mapped steps,
  aggregation/report steps, and any branch-control parameter as source facts. It
  must not present unresolved `collect` / `mix` behavior as already-implemented
  Galaxy wiring.

## Property: operator translation is classified, not guessed

- bucket: utility
- check: llm-judged
- assertion: for a summary whose `workflow.edges[].via` includes operators such
  as `map`, `join`, `mix`, `groupTuple`, or `branch`, the draft classifies each
  meaningful operator as wiring, collection semantics, explicit placeholder step,
  or review trigger. Low-confidence Groovy/operator semantics become open
  questions instead of invented Galaxy tools.

## Property: collection shape survives across nodes

- bucket: fidelity
- check: llm-judged
- assertion: for a summary with sample-sheet or tuple(meta, path...) input and at
  least one mapped process, the draft keeps the collection shape and
  identifier/metadata story visible from input through mapped steps and any
  gather/reduce step.

## Property: unresolved tool needs are bounded

- bucket: handoff
- check: llm-judged
- assertion: the draft lists unresolved Galaxy tool or placeholder needs with
  enough source context for later tool discovery and template authoring, but does
  not resolve exact Tool Shed IDs or detailed parameters.

## Property: template Mold can consume the draft

- bucket: handoff
- check: llm-judged
- assertion: `nextflow-summary-to-galaxy-template` can turn the draft into
  workflow inputs, placeholder steps, rough connections, and TODO notes without
  asking for missing basics such as node names, source processes, or open
  questions.
