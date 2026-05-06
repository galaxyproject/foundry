# nextflow-summary-to-galaxy-data-flow eval

Evaluation plan for the `nextflow-summary-to-galaxy-data-flow` Mold. These cases look for a useful Galaxy-facing draft of data movement and unresolved operations; exact section names are less important than preserving the handoff.

## Case: demo data flow preserves source process intent

- bucket: fidelity
- check: llm-judged
- fixture: committed `nf-core__demo` summary plus its interface brief.
- expectation: draft includes FastQC map-over, optional SeqTK trimming, MultiQC report aggregation, and the `skip_trim` branch as source facts. It must not present unresolved `collect` / `mix` behavior as already implemented Galaxy wiring.

## Case: operator translation is classified, not guessed

- bucket: utility
- check: llm-judged
- fixture: a summary whose `workflow.edges[].via` includes operators such as `map`, `join`, `mix`, `groupTuple`, or `branch`.
- expectation: draft classifies each meaningful operator as wiring, collection semantics, explicit placeholder step, or review trigger. Low-confidence Groovy/operator semantics become open questions instead of invented Galaxy tools.

## Case: collection shape survives across nodes

- bucket: fidelity
- check: llm-judged
- fixture: a summary with sample-sheet or tuple(meta, path...) input and at least one mapped process.
- expectation: draft keeps the collection shape and identifier/metadata story visible from input through mapped steps and any gather/reduce step.

## Case: unresolved tool needs are bounded

- bucket: handoff
- check: llm-judged
- fixture: any non-trivial summary with multiple processes.
- expectation: draft lists unresolved Galaxy tool or placeholder needs with enough source context for later tool discovery and template authoring, but does not resolve exact Tool Shed IDs or detailed parameters.

## Case: template Mold can consume the draft

- bucket: handoff
- check: llm-judged
- fixture: source summary, interface brief, and data-flow brief.
- expectation: `nextflow-summary-to-galaxy-template` can turn the draft into workflow inputs, placeholder steps, rough connections, and TODO notes without asking for missing basics such as node names, source processes, or open questions.
