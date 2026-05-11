# Schema Packages

Foundry-authored Mold IO schemas live in TypeScript packages. The `content/schemas/` tree only holds the human-readable `<name>.md` schema notes; there are no JSON mirrors there. Mold frontmatter cites schemas as `[[wiki-link]]` to the schema note — cast resolves the wiki-link, reads `package` + `package_export` from the note's frontmatter, imports the named runtime export, and serializes it into the bundle.

## Where a schema lives

The rule: **schema lives with its producer; orphan schemas live in `foundry`.**

- A schema with a TypeScript producer in this repo lives in the producer's package. Today: `summary-nextflow` lives in `@galaxy-foundry/summarize-nextflow` because that package emits it.
- A schema with no in-repo TS producer ("orphan") lives in `@galaxy-foundry/foundry`. Today: `summary-cwl`, `galaxy-tool-discovery`, `galaxy-tool-summary`, `tests-format`.
- Vendored upstream schemas (e.g. nf-core meta schemas, parsed-tool from `@galaxy-tool-util/schema`) live in whichever package needs them at runtime.

There is no separate `*-schema` package. Validators all funnel through one CLI: `foundry validate-<name>`.

## Source chain

1. Author the canonical JSON Schema at `packages/<owner>/src/schemas/<name>/<name>.schema.json` (foundry) or `packages/summarize-nextflow/src/schema/<name>.schema.json` (producer-co-located).
2. Add the renderable schema note at `content/schemas/<name>.md` with `type: schema`, `package`, `package_export`, `validator_bin: foundry`, and `validator_subcommand: validate-<name>`.
3. Regenerate `<name>.schema.generated.ts` via the package's `scripts/sync-schema.mjs` (run on `prebuild`).
4. Wire a subcommand in `packages/foundry/src/commands/validate-<name>.ts` using `createValidator()` + `runJsonValidator()` from `lib/`.
5. Register the schema in `site/src/lib/schema-registry.ts`.

## Validator invocation

Generated skills validate through the CLI: `foundry validate-<name> <artifact-path>`. Cast bundles `validator_bin` + `args` (`[validator_subcommand, "{artifact_path}"]`) into `_verify.json` so `validate-artifact` can spawn the right command.

Library validators are also exported from `@galaxy-foundry/foundry` and `@galaxy-foundry/summarize-nextflow` for TS consumers (the site uses these). Skills should still prefer the CLI so failures reproduce on a developer machine without needing a TS toolchain.

## Current schemas

| Schema | Owner package | Subcommand |
|---|---|---|
| `summary-nextflow` | `@galaxy-foundry/summarize-nextflow` | `foundry validate-summary-nextflow` |
| `summary-cwl` | `@galaxy-foundry/foundry` | `foundry validate-summary-cwl` |
| `galaxy-tool-discovery` | `@galaxy-foundry/foundry` | `foundry validate-galaxy-tool-discovery` |
| `galaxy-tool-summary` | `@galaxy-foundry/foundry` | `foundry validate-galaxy-tool-summary` |
| `tests-format` | `@galaxy-foundry/foundry` (vendored from `@galaxy-tool-util/schema`) | `foundry validate-tests-format` |
