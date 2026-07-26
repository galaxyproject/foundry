# Mold

A **Mold** describes *one repeatable action* — not a document, not a tutorial, but a unit of
work worth casting into a skill artifact. Its body says how to do the action; its frontmatter
declares the *typed reference manifest* naming every note the cast must carry, and how.

Molds are the substrate's centre of gravity. Everything else in the corpus exists so a Mold can
cite it.

## Why each required field is required

- **`name`** — the stable slug the pipeline and the cast bundle address the Mold by. Distinct
  from `title`, which is prose for a reader.
- **`axis`** — which dimension the Mold is specialized along, and therefore how a caller
  *selects* it. `source-specific` / `target-specific` / `tool-specific` each require the
  matching field (`source` / `target` / `tool`): an axis that names no subject is a Mold
  nothing can be selected by, so the schema rejects it rather than letting it sit unfindable.
  `generic` requires none — it applies everywhere.
- The **base envelope** (`tags`, `status`, `created`, `revised`, `revision`, `ai_generated`,
  `summary`) — as on every kind. `summary` is bounded 20–160 characters because it is printed
  in every browse row; unbounded, half the catalog renders as a bare name and the other half
  as a paragraph.

## The optional fields that carry the weight

- **`references`** — the manifest. Each entry draws `kind` / `used_at` / `load` / `mode` /
  `evidence` from `reference_contract.yml`. Two rules the schema enforces: `load: on-demand`
  requires a `trigger` (a reference the cast is never told to read is unreachable), and
  `evidence: hypothesis` requires a `verification` (an unmarked guess is the failure mode the
  field exists to prevent).
- **`input_artifacts` / `output_artifacts`** — the Mold's declared IO, which is what lets
  Molds be composed into a pipeline phase without reading their bodies. An output may name a
  `schema` note, making the handoff machine-checkable.
- **`loop_endstate`** — for a Mold that runs until a condition holds, the condition. Prose,
  but *required* prose once the Mold loops: "until it passes" is not an end state.
