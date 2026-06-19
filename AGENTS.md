# Working in the Galaxy Workflow Foundry

## Read first

**Read `content/glossary.md` immediately at session start.** The Foundry uses domain-specific terminology — Mold, Pipeline, Phase, Branch, Cast, Pattern, CLI Mold, Foundry, axis, … — that isn't standard Galaxy or workflow vocabulary. The glossary is small, alphabetical, and worth loading in full before reasoning about anything else here. Misreading a Mold note without knowing what "Mold" means leads nowhere good.

## Then orient

- `README.md` — what this project is and why.
- `docs/ARCHITECTURE.md` — directory layout, types, validation pipeline, site rendering. The structural authority.
- `docs/MOLDS.md` — Mold inventory and bucketing axes.
- `docs/MOLD_SPEC.md` — Mold authoring contract (frontmatter, references, eval/usage/refinement). Load when authoring or editing a Mold or its `eval.md`.
- `docs/HARNESS_PIPELINES.md` — pipeline narrative behind `content/pipelines/`.
- `docs/COMPILATION_PIPELINE.md` — casting design.
- `docs/CORPUS_INGESTION.md` — IWC grounding; URL-not-mirror principle.

## Authoring rules

- **Frontmatter is contract.** `meta_schema.yml` is JSON Schema Draft 07 with `additionalProperties: false`. Unknown fields are rejected. Add a property declaration in the schema before adding a frontmatter field anywhere.
- **Tags must be registered.** Every tag a note uses lives in `meta_tags.yml`. Vocabulary changes touch one file.
- **Wiki-link fields use `[[Target]]`.** Single-value fields (`parent_pattern`) and array fields (`related_notes`, `related_patterns`, `related_molds`, `patterns`, `cli_commands`, `prompts`).
- **Polished IWC references should survive corpus churn.** Pattern pages, Mold pages, and other polished content should cite abstract IWC workflow IDs without generated extensions or fixture roots, e.g. `transcriptomics/rnaseq-pe/rnaseq-pe`, plus step labels or step IDs when needed. Do not cite generated `.ga`/`.gxwf.yml` paths or line numbers in polished pages; reserve those for surveys, ad-hoc research notes, and local debugging evidence.
- **Validate before commit.** `npm run validate` checks schema + cross-file resolution. Errors block; warnings are advisory.
- **Mold IO schemas live in their packages.** Source of truth for Foundry-authored schemas (`summary-nextflow`, `galaxy-tool-discovery`) is `packages/<name>-schema/src/<name>.schema.json`. The vendored test schema (`tests`) lives in `packages/tests-format-schema/src/`, synced from `@galaxy-tool-util/schema`. Mold frontmatter cites schemas via `[[wiki-link]]` to a `type: schema` note in `content/schemas/<name>.md`; the note declares `package` and `package_export`, and cast imports the named runtime export at build time and serializes it into the bundle. Producer Molds attach a schema to their output via `output_artifacts[].schema`; consumers inherit via shared `id`. There is no `content/schemas/*.schema.json` mirror — only the human-readable schema notes live there.
- **Don't edit generated files by hand.** `Dashboard.md` and `Index.md` are produced by `scripts/generate-*.ts`. Cast bundles under `casts/` (`SKILL.md`, `_provenance.json`, `_verify.json`, copied references) are produced by `foundry-build cast` / `scripts/cast-mold.ts`; change the Mold, caster, schema package, or reference source and regenerate instead. Assembled pipeline harnesses under `casts/claude/skills/pipeline-*/` (`SKILL.md`, `_assembly.json`) are produced by `foundry-build assemble-pipeline <slug>` / `make assemble-pipelines`; they project the Pipeline note's `phases:` spine plus each Mold's `summary`/`loop_endstate` and the pipeline's `harness_notes` — edit those sources and regenerate, don't hand-edit the harness. `make check-assemble-pipelines` is the byte-diff drift gate. If generated cast files conflict during cherry-pick/merge, prefer rerunning the caster after resolving source files, not hand-patching generated JSON. `glossary.md` is hand-curated and skipped by the validator. `log.md` is append-only.

## Don't

- **Don't weaken the schema to accept a non-conforming note.** Reshape the note or extend the schema deliberately (with tests).
- **Don't add ad-hoc frontmatter fields.** `additionalProperties: false` rejects them.
- **Don't write multi-paragraph comments in code.** One short line max, only when intent isn't obvious from the code.
- **Don't use Obsidian Templater.** Foundry doesn't carry it; slash commands handle scaffolding.

## Run

```sh
npm run validate           # schema + cross-file checks
npm run test               # vitest (root: validator + content tests)
npm run typecheck          # tsc --noEmit (foundry-internal scripts/)
npm run packages-test      # vitest across packages/* via pnpm -r
npm run packages-typecheck # tsc --noEmit across packages/* via pnpm -r
npm run packages-build     # tsc emit across packages/*
npm run packages-format    # prettier --check across packages/*
npm run packages-lint      # eslint across packages/*
```

Format/lint enforcement also runs via `pre-commit` (`.pre-commit-config.yaml`). Install once per clone with `pre-commit install`; mirrors the galaxy-tool-util setup.

The top-level `Makefile` mirrors common entry points:

```sh
make validate          # npm run validate
make test              # npm run test
make typecheck         # npm run typecheck
make fixtures          # materialize Nextflow fixtures + IWC format2 + IWC skeletons
make fixtures-nextflow # materialize workflow-fixtures/pipelines/
make fixtures-cwl      # materialize workflow-fixtures/cwl/
make fixtures-iwc      # materialize workflow-fixtures/iwc-src, iwc-cleaned, iwc-format2
make fixtures-skeletons # materialize workflow-fixtures/iwc-skeletons from iwc-format2
make fixtures-verify   # verify materialized fixture SHAs
make fixtures-clean    # remove generated fixture dirs
```

## Vendored planemo artifacts

Foundry vendors two planemo JSON artifacts so contributor laptops and CI don't need planemo installed:

- `packages/planemo-test-report-schema/src/test-report.schema.json` — JSON Schema for `planemo test --test_output_json`. Powers the convergence-loop gate in [[convert-nfcore-module-to-galaxy-tool]].
- `packages/planemo-cli-meta/src/cli-meta.json` — minimal command list feeding the validator's cli-command coverage check.

The vendored artifacts pin to the planemo release recorded in `content/cli/planemo/index.md`. **planemo is only required when regenerating these artifacts.** Normal Foundry work — `npm run validate`, `npm run test`, `npm run packages-test`, `make validate`, `make test` — reads the checked-in JSON.

Regenerate with:

```sh
make sync-planemo               # all vendored planemo artifacts
make sync-planemo-cli           # CLI manual pages under content/cli/planemo/
make sync-planemo-cli-meta      # packages/planemo-cli-meta/
make sync-planemo-test-report-schema  # packages/planemo-test-report-schema/
make check-planemo-cli          # fail on planemo CLI page drift (CI)
```

Install the pinned planemo via:

```sh
uvx --from planemo==<version> planemo --version
```

Take the `<version>` from `content/cli/planemo/index.md`'s `package_version`.

## Generated fixtures

`workflow-fixtures/` is the generated-corpus workspace used for research, not committed content. The generated directories are gitignored and may be absent in a fresh worktree:

- `workflow-fixtures/pipelines/` — pinned Nextflow pipeline clones from `workflow-fixtures/fixtures.yaml`.
- `workflow-fixtures/cwl/` — pinned CWL workflow/tool repository clones from `workflow-fixtures/fixtures.yaml`.
- `workflow-fixtures/iwc-src/` — pinned IWC clone.
- `workflow-fixtures/iwc-cleaned/` — intermediate cleaned Galaxy workflows.
- `workflow-fixtures/iwc-format2/` — cleaned gxformat2 IWC corpus, cited as `$IWC_FORMAT2/...` in surveys and ad-hoc research only.
- `workflow-fixtures/iwc-skeletons/` — structural-only views, cited as `$IWC_SKELETONS/...` in surveys and ad-hoc research only.

Before launching or acting as a research subagent that needs corpus evidence, check whether the needed generated dirs exist. If they are missing, use the top-level fixture targets above. If you cannot materialize them, stop and report the missing target instead of inventing evidence.

When launching research subagents, ask for evidence quality explicitly. Reports should separate corpus-observed claims, architectural or design inferences, external-doc claims, and speculative or low-confidence claims. Do not let plausible mappings stand as corpus evidence unless they cite fixtures or existing Foundry notes.

For IWC survey work, prefer `make fixtures-iwc fixtures-skeletons` before mining `$IWC_FORMAT2` or `$IWC_SKELETONS`. For Nextflow example work, prefer `make fixtures-nextflow` before reading `workflow-fixtures/pipelines/`. For CWL example work, prefer `make fixtures-cwl` before reading `workflow-fixtures/cwl/`.

## Package layout

Publishable CLIs live under `packages/<name>/` as a pnpm workspace; mirrors `galaxy-tool-util-ts`'s structure. Runtime packages include `@galaxy-foundry/summarize-nextflow`; build/authoring tooling lives in `@galaxy-foundry/build-cli` with the `foundry-build` bin. Top-level `scripts/` files are compatibility wrappers or repo-local one-offs. pnpm 10.x is the package manager (`packageManager` field is contractual). The npm wrappers above invoke `pnpm -r` under the hood.
