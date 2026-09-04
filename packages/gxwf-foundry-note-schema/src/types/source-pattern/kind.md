# Source Pattern

A **Source Pattern** is a shape that recurs in one *source* ecosystem — a Nextflow channel
idiom, a CWL scatter convention — held deliberately separate from the target-side `pattern`
notes that say what to *do* about it.

The split exists because the two sides have different lifetimes. A source ecosystem changes on
its own schedule; when it does, the source-pattern notes go stale together, and the target-side
patterns they point at usually do not. Merging them into one kind would make every upstream
change look like a change to Galaxy knowledge.

This kind is **instance-specific**: it only makes sense for a Foundry whose work is *conversion*
between two named ecosystems.

## Why each required field is required

- **`source`** and **`target`** — the pair the pattern bridges. Both required: a source shape
  with no stated target is an observation about someone else's ecosystem, not knowledge this
  Foundry can act on.
- **`source_pattern_kind`** — `moc`, `channel-shape`, `operator`, `lifecycle`, or
  `review-trigger`. What sort of recurring thing it is, and therefore when it gets consulted.
- **`implemented_by_patterns`** — at least one `[[wiki-link]]` to the target-side Pattern that
  handles it. **`min(1)` is the load-bearing rule of this kind**: a source shape nothing
  implements is a note that can never be acted on, and the link is what makes the source/target
  split navigable in both directions instead of a one-way pile.
- **`title`** and the **base envelope** — as on every kind.

## Optional fields

- **`review_triggers`** — conditions under which a converted workflow should be looked at again
  because this shape was involved.
