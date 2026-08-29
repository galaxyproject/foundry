# CLI Tool

A **CLI Tool** note describes one external command-line program the casting pipeline may
invoke: where it comes from, how to run it, and how to tell whether it is present.

It pairs with `cli-command`: the tool note is the *installation and invocation* record, the
command notes are the manual pages. One `cli-tool` typically has several `cli-command` siblings.

This kind is **instance-specific**: it exists because this Foundry's casts shell out to real
binaries. A Foundry whose skills invoke no external program needs neither this kind nor
`cli-command`.

## Why each required field is required

- **`tool`** — the kebab slug the `cli-command` notes join on. This is the whole reason the two
  kinds can stay separate.
- **`origin`** (`npm` | `pypi` | `workspace`) and **`package`** — how to install it. A tool a cast
  is told to run but not told how to obtain is a runtime failure waiting for the first clean
  machine. `workspace` is for a tool this repository builds and has not published: it renders a
  build-from-checkout line instead of an install command, because naming a registry that does not
  carry the package is worse than naming none — `npx <bin>` can resolve to an unrelated package
  that owns the name.
- **`invoke`** — the actual binary name, which is frequently *not* the package name.
- The **base envelope** — as on every kind.

## Optional fields

- **`package_version`** — pin it when a cast depends on version-specific behaviour.
- **`invoke_fallback`** — a second way to run it (`npx …`, `python -m …`) when the binary is not
  on `PATH`.
- **`availability_check`** — the command that answers "is it here?", so the cast can check
  rather than fail mid-run.
- **`docs_url`** — upstream documentation.
