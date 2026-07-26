# CLI Command

A **CLI Command** note is a manual page for one subcommand, authored so a cast reads the real
flags instead of inventing plausible ones.

This is the kind that most directly buys correctness: hallucinated command-line flags are
syntactically perfect and completely wrong, and no amount of prompt care fixes that. Writing the
page down and referencing it does.

## Why each required field is required

- **`tool`** — the `cli-tool` slug this command belongs to. The join key.
- **`command`** — the subcommand itself. Together with `tool` it identifies the page.
- The **base envelope** — as on every kind.

## Optional fields

- **`package`** / **`upstream`** — where the command's implementation lives, for the reader who
  needs to check the page against the source.

## Body convention

The validator warns when the body omits a `## Gotchas` section. That is deliberate: the flags
are recoverable from `--help`, but the failure modes are exactly what a cast cannot discover on
its own, and they are the reason the note is worth its tokens.
