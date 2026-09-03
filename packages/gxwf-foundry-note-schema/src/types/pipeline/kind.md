# Pipeline

A **Pipeline** composes Molds into an ordered end-to-end protocol. It is the *composition
layer*, and it is optional: a Foundry whose actions stand alone needs no Pipelines at all.

Keep it thin. The Pipeline names phases and their order; it does not restate what the Molds do.
Anything a phase explains about the work itself belongs in the Mold.

This kind is **instance-specific**. Workflow construction is inherently sequential, so Pipelines
earn their keep here; a domain whose Molds are a standalone toolkit should not adopt this kind
just because the parent has it.

## Why each required field is required

- **`title`** — the protocol's name, as a reader navigating the map sees it.
- **`phases`** (min 1) — the ordered steps. Each phase is one of two shapes:
  - a **Mold phase** — `{ mold: "[[slug]]", loop?: true }`;
  - a **branch phase** — `{ branch: "<question>", branches: [...] | chain: [...] }`, which must
    carry `branches` or `chain`. A branch that names a decision but lists no alternatives is a
    phase nothing can execute, so the schema rejects it.

  A branch item may be a `[[wiki-link]]`, free text for a terminal outcome
  (`"user-supplied"`), or `{ fallthrough: "[[slug]]" }` for the default arm.
- The **base envelope** — as on every kind.

## Optional fields

- **`harness_notes`** — what the orchestrator running this pipeline needs to know that is not
  in any single phase.
