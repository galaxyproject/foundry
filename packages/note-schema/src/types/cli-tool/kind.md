# CLI Tool

A **CLI Tool** note describes one external command-line program the casting pipeline may
invoke: where it comes from, how to run it, and how to tell whether it is present.

It pairs with `cli-command`: the tool note is the *installation and invocation* record, the
command notes are the manual pages. One `cli-tool` typically has several `cli-command` siblings.

## Why each required field is required

- **`tool`** — the kebab slug the `cli-command` notes join on. This is the whole reason the two
  kinds can stay separate.
- **`origin`** (`npm` | `pypi`) and **`package`** — how to install it. A tool a cast is told to
  run but not told how to obtain is a runtime failure waiting for the first clean machine.
- **`invoke`** — the actual binary name, which is frequently *not* the package name.
- The **base envelope** — as on every kind.

## Optional fields

- **`package_version`** — pin it when a cast depends on version-specific behaviour.
- **`invoke_fallback`** — a second way to run it (`npx …`, `python -m …`) when the binary is not
  on `PATH`.
- **`availability_check`** — the command that answers "is it here?", so the cast can check
  rather than fail mid-run.
- **`docs_url`** — upstream documentation.
