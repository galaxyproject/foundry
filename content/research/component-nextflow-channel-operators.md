---
type: research
subtype: component
tags:
  - research/component
  - source/nextflow
component: "Nextflow Channel Operators"
status: draft
created: 2026-05-05
revised: 2026-05-05
revision: 1
ai_generated: true
summary: "Structured digest of Nextflow channel operators (47 entries) with cardinality and shape semantics; backs summarize-nextflow §6 edge reconciliation."
companions:
  - "component-nextflow-channel-operators.yml"
sources:
  - "https://docs.seqera.io/nextflow/reference/operator"
  - "https://www.nextflow.io/docs/latest/reference/operator.html"
  - "https://training.nextflow.io/2.1/basic_training/operators/"
related_molds:
  - "[[summarize-nextflow]]"
related_notes:
  - "[[nextflow-workflow-io-semantics]]"
  - "[[component-nextflow-pipeline-anatomy]]"
---

# Nextflow Channel Operators

Operational grounding for [[summarize-nextflow]] §6 ("Reconcile the workflow DAG"). The Mold's deterministic parser records the *literal* operator chain a workflow uses (`["map", "join", "groupTuple"]` in `Edge.via`); a second LLM pass reconciles the chain into a coherent `from → to` edge with resolved shape.

That reconciliation badly needs operator-level cardinality semantics: which operators preserve cardinality, which fan out, which fan in, which fork. Without a structured operator catalog, the LLM is guessing.

Companion structured form: `component-nextflow-channel-operators.yml`. The cast skill consumes the YAML at runtime; this prose note explains the categories and the cardinality model.

## Categories

Six categories, ordered by how they affect downstream channel cardinality:

1. **`transform`** — emits one output per input. Cardinality preserved. (`map`, `view`, `set`, `tap`, `dump`, `ifEmpty`, `randomSample`.)
2. **`filter`** — emits ≤ one output per input. Cardinality reduced. (`filter`, `distinct`, `unique`, `first`, `last`, `take`, `until`.)
3. **`fan-in`** — collects N inputs into 1 (or fewer) outputs. (`collect`, `collectFile`, `groupTuple`, `reduce`, `sum`, `count*`, `max`, `min`, `toList`, `toSortedList`, `buffer`, `collate`.)
4. **`fan-out`** — emits >1 outputs per input. (`flatten`, `flatMap`, `transpose`, `splitCsv`, `splitFasta`, `splitFastq`, `splitJson`, `splitText`.)
5. **`combine`** — joins or concatenates two source channels. (`combine`, `concat`, `cross`, `join`, `merge`, `mix`.)
6. **`fork`** — splits one source channel into multiple downstream channels. (`branch`, `multiMap`.) Returns a multi-channel object, not a single channel.
7. **`terminal`** — consumes a channel without producing one. (`subscribe`.) Rare in workflow definitions; usually only in `view`-adjacent debug paths.

The category determines what the resolver records as the chain's effect on shape. A chain that ends in `groupTuple` produces a list-shaped output even if every preceding operator was `transform`-category. A chain containing `branch` produces multiple downstream channels and the cast skill must record the branch keys.

## Reading the YAML

Each entry has:

- `name` — exact operator identifier as it appears in DSL2 source.
- `category` — one of the seven above.
- `arity_in` — how many channels the operator consumes (`1` or `2`).
- `cardinality` — `preserved` | `reduced` | `expanded` | `aggregated` | `forked`.
- `output_shape_rule` — terse description of what the output channel's shape is, given the input.
- `key_args` — the parameters that materially change the shape effect (e.g., `groupTuple(by: [0, 1])`'s grouping key).
- `notes` — anything that surprises an inattentive reader (e.g., `merge` is deprecated in DSL2, `cross` joins on first element).

The cast skill's reconciliation pass walks the chain left-to-right, applying each entry's `output_shape_rule` to the running shape estimate. When the LLM is uncertain, `Edge.notes` records the reasoning chain for review.

## Anti-patterns to recognize, not resolve

The Mold §6 says operator chains with deeply nested closures may produce edges flagged with low confidence. Specifically:

- **`map { ... }` with substantial Groovy logic.** The closure can reshape arbitrarily; the YAML's `output_shape_rule: same shape unless closure restructures` is honest about the limit. The LLM falls back to surface inspection of the closure body.
- **`branch { ... }` with non-obvious keys.** The branch keys are determined by the closure; static parsing recovers the keys from `branch.<name>` references in the workflow body.
- **`multiMap { ... }` returning records.** Same as branch — the keys come from the closure's emit list.
- **`cross` / `combine` with complex keys.** `cross` joins on the first tuple element by default; `combine(by: [0, 1])` joins on multiple elements. The reconciliation needs to know which.

## Cross-references

- `summarize-nextflow.md` §6 — the consumer of this digest.
- [[component-nextflow-pipeline-anatomy]] — DSL2 layout context.
- The `Edge.via` field in [[summary-nextflow]] — where the operator chain is recorded.

## Open gaps

_Updated when contact with real pipelines reveals an operator pattern the bucketing rules do not handle cleanly. Each entry names the motivating target._
