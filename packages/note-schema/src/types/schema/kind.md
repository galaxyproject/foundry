# Schema Note

A **Schema Note** documents a machine-checkable contract a cast can validate its output
against, and names the validator that decides it. It is how a Mold's `output_artifacts` stop
being a promise and start being a check.

## Why each required field is required

- **`name`** — the slug a Mold's `output_artifacts[].schema` wiki-link resolves to.
- **`title`** — prose, for the reader.
- The **base envelope** — as on every kind.

## Optional fields

- **`package`** / **`package_export`** — where the schema is importable from. The validator
  requires both on any note a `references[].kind: schema` entry points at: a schema you cannot
  import is a schema no cast can run.
- **`validator_bin`** / **`validator_subcommand`** — the command that checks against it.
- **`upstream`** — where the schema came from, if it is vendored.
- **`license`** / **`license_file`** — see the rule below.

## The cross-field rule this kind enforces

A schema note whose `upstream` points **outside this repository** is redistributing someone
else's work, so it **must** declare a `license`. And where that licence's row in
`license-policy.yml` says the text travels with the content, it must also declare a
`license_file` pointing at the vendored copy under `LICENSES/`.

An `upstream` inside `github.com/galaxyproject/foundry/` is our own work and needs neither —
which is why the rule keys off *where upstream points*, not on whether the field is present.
