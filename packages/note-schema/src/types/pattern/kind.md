# Pattern

A **Pattern** is one reusable piece of domain knowledge, authored so that a Mold can *cite* it
instead of restating it. Patterns are the corpus a cast is grounded in: if a Mold's body starts
explaining how something generally works, that explanation wants to be a Pattern.

## Why each required field is required

- **`title`** — patterns are read by humans browsing the corpus, and a slug is not a title.
- **`pattern_kind`** — `operation` (one transformation), `recipe` (an assembled sequence), or
  `moc` (a map of content: a hub note whose job is to point at others). The three are browsed
  and cast differently, so the distinction is declared rather than guessed from the body.
- **`evidence`** — how strongly the corpus supports the claim: `corpus-observed`,
  `structurally-verified`, `corpus-and-verified`, or `hypothesis`. **`hypothesis` is legal**,
  and that is the point: a speculative pattern that is *marked* speculative can be safely
  loaded and later verified, while an unmarked one silently anchors every cast that reads it.
  This field is what keeps the corpus honest as it grows faster than it is checked.
- The **base envelope** — as on every kind.

## Optional fields

- **`iwc_exemplars`** — citations into the IWC workflow corpus that exhibit the pattern, each
  with a `why` and a `confidence`. This is what makes `corpus-observed` checkable rather than
  asserted: the exemplar names the workflow, and a reviewer can go look.
- **`parent_pattern`** — a `[[wiki-link]]` to the more general pattern this specializes.
- **`verification_paths`** — how someone would confirm the claim.
- **`companions`** — sibling files the cast copies verbatim beside the note.
