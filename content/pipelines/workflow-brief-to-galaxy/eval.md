# Brief-to-Galaxy pipeline evaluation

## Property: declared blockers, absent review, or failed preflight stop before design

- check: deterministic
- assertion: The harness runs the blocker check before phase 1 and on resumption, and records review and current preflight evidence. A failed gate produces no design, draft, or implementation artifact.

## Property: the brief remains unchanged across all phases

- check: deterministic
- assertion: The brief hash equals its entry hash after every phase and loop iteration and on resumption. A mismatch stops the journey.

## Property: scope remains governed by the reviewed input

- check: llm-judged
- assertion: Downstream design and implementation respect included/excluded work and expert requirements. Original source evidence cannot silently add analyses.

## Property: progress and recommendations stay in the ledger

- check: llm-judged
- assertion: The run records evidence and recommended brief changes outside the input brief. An implementation agent does not accept or apply a brief change.
