# Design Record

A **Design Record** says why the Foundry is built the way it is. It is the only kind whose
subject is the Foundry itself rather than the domain the Foundry knows about — the architecture,
the guiding principles, the casting procedure, the Mold contract.

These records used to live in a top-level `docs/` directory, outside every collection, surfaced
by a hand-written array in the site's TypeScript that restated each one's title, summary and
category. That array was the actual registry, and it drifted: two records sat in `docs/` that it
never named, so they were rendered by nothing and no check noticed. Being a kind is what fixes
that — a collection cannot have a member the site does not render.

This kind is **substrate**. Every Foundry instance accumulates a design record, and every one of
them faces the same question of where it lives; `content/meta/` is the shared answer.

## Why each required field is required

- **`title`** — required here, though the base envelope makes it optional. A design record is
  addressed by name, in prose and on a navigation card. A research note can fall back to its
  summary; a record called "Architecture" cannot.
- **`record_kind`** — which shelf the record sits on. `foundation` is the core rationale a
  reader works through; `infrastructure` is developer-facing evaluation of how the Foundry is
  built and hosted. The two are read for different reasons and are presented apart.
- **`order`** — reading order within a shelf. This is the one thing the old array carried that
  frontmatter otherwise could not: its **position**. The sequence is pedagogical — principles
  before architecture, architecture before the Mold inventory — so neither `created` nor an
  alphabetical sort reproduces it.
- The **base envelope** (`tags`, `status`, `created`, `revised`, `revision`, `summary`) — as on
  every kind. `summary` matters more here than elsewhere: it is the card text on the design
  index, so it was already being written by hand. It just was not being *checked*, and one of
  the summaries inherited from the old array was over the 160-character bound.

## What this kind deliberately does not carry

No `references`. A design record is not cast into a skill artifact — it explains the machinery
that does the casting. If a record ever needs to be carried into an artifact, that is a sign the
material belongs in a Mold or a pattern, where the reference contract applies.

## The glossary is not one of these

`content/meta/glossary.md` sits in the same directory and is deliberately **not** a note of this
kind. It is hand-curated, alphabetical, and rendered by its own page; the collection excludes it
by name. Sharing a directory with the design records is a filing decision, not a typing one.
