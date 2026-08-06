# CLI Command

A **CLI Command** note is a manual page for one subcommand, authored so a cast reads the real
flags instead of inventing plausible ones.

This is the kind that most directly buys correctness: hallucinated command-line flags are
syntactically perfect and completely wrong, and no amount of prompt care fixes that. Writing the
page down and referencing it does.

This kind is **instance-specific**, and pairs with `cli-tool`: both exist because this Foundry's
casts run real binaries.

## Why each required field is required

- **`tool`** — the `cli-tool` slug this command belongs to. The join key.
- **`command`** — the subcommand itself. Together with `tool` it identifies the page.
- The **base envelope** — as on every kind.

## Optional fields

- **`package`** — the distribution the command ships in.
- **`source_url`** — the external document this page summarizes: the spec entry or the command
  implementation, ideally at a pinned ref, so a reader can check the page against what it was
  written from. It earns its place only where the page really is a summary of something else; a
  command implemented in this repository has no upstream to name, and pointing the field back at
  our own source says nothing a reader could act on.

  The name is shared with the sibling Foundry, which spells the same idea `source_url` and
  constrains it the same way. `upstream` on a `schema` note is a different field for a different
  job — see that kind.

## Body convention

The validator warns when the body omits a `## Gotchas` section. That is deliberate: the flags
are recoverable from `--help`, but the failure modes are exactly what a cast cannot discover on
its own, and they are the reason the note is worth its tokens.
